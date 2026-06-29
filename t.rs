use quick_xml::events::Event;
use quick_xml::Reader;
use std::collections::hash_map::DefaultHasher;
use std::collections::HashMap;
use std::fs::{self, File, OpenOptions};
use std::hash::{Hash, Hasher};
use std::io::{BufReader, BufWriter, Write};
use std::sync::mpsc;
use std::thread;

/// The worker thread function: receives messages and writes to disk.
fn writer_worker(rx: mpsc::Receiver<(String, String)>, output_dir: String) {
    // Each worker manages its own set of files. No locks needed!
    let mut open_files: HashMap<String, BufWriter<File>> = HashMap::new();

    // Process messages until the main thread closes the channel
    while let Ok((tag, text)) = rx.recv() {
        let writer = open_files.entry(tag.clone()).or_insert_with(|| {
            let path = format!("{}/{}.txt", output_dir, tag);
            let f = OpenOptions::new()
                .create(true)
                .append(true)
                .open(path)
                .expect("Failed to open output file");
            BufWriter::new(f)
        });
        
        if let Err(e) = writeln!(writer, "{}", text) {
            eprintln!("Error writing to file for tag {}: {}", tag, e);
        }
    }

    // Channel closed: flush and close all files held by this worker
    for (tag, mut writer) in open_files {
        if let Err(e) = writer.flush() {
            eprintln!("Error flushing file for tag {}: {}", tag, e);
        }
    }
}

/// Hashes the tag name to deterministically assign it to a specific worker thread.
fn get_worker_index(tag: &str, num_workers: usize) -> usize {
    let mut hasher = DefaultHasher::new();
    tag.hash(&mut hasher);
    (hasher.finish() as usize) % num_workers
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let input_file = "large_input.xml";
    let output_dir = "output";
    
    fs::create_dir_all(output_dir)?;

    // --- 1. Setup Multi-threading ---
    // Adjust based on your CPU cores. 4-8 is usually the sweet spot for disk I/O.
    let num_workers = 4; 
    let mut senders = Vec::with_capacity(num_workers);
    let mut handles = Vec::with_capacity(num_workers);

    for _ in 0..num_workers {
        // Bounded channel (capacity 10,000). 
        // If the disk is slow, this applies "backpressure" to the parser so we don't run out of RAM.
        let (tx, rx) = mpsc::sync_channel(10_000); 
        senders.push(tx);
        
        let dir = output_dir.to_string();
        handles.push(thread::spawn(move || writer_worker(rx, dir)));
    }

    // --- 2. Setup XML Parser ---
    let file = File::open(input_file)?;
    let buf_reader = BufReader::new(file);
    let mut reader = Reader::from_reader(buf_reader);
    reader.config_mut().trim_text(true);

    let mut tag_stack: Vec<String> = Vec::new();
    let mut buf = Vec::new();

    println!("Starting multi-threaded parse of {}...", input_file);

    // --- 3. Stream and Distribute ---
    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(e)) => {
                let tag_name = String::from_utf8_lossy(e.name().as_ref()).to_string();
                tag_stack.push(tag_name);
            }
            Ok(Event::End(_)) => {
                tag_stack.pop();
            }
            Ok(Event::Text(e)) => {
                let text = e.unescape()?.to_string();
                
                if !text.is_empty() {
                    if let Some(current_tag) = tag_stack.last() {
                        // 1. Hash the tag to find the correct worker
                        let worker_idx = get_worker_index(current_tag, num_workers);
                        
                        // 2. Send data to the worker. 
                        // If the channel is full, this blocks (backpressure), saving your RAM.
                        if let Err(e) = senders[worker_idx].send((current_tag.clone(), text)) {
                            eprintln!("Worker channel closed unexpectedly: {}", e);
                            break;
                        }
                    }
                }
            }
            Ok(Event::Eof) => break,
            Err(e) => {
                eprintln!("XML Error at position {}: {:?}", reader.buffer_position(), e);
                break;
            }
            _ => (),
        }
        buf.clear();
    }

    // --- 4. Cleanup ---
    println!("Parsing complete. Dropping senders to signal workers...");
    drop(senders); // Dropping senders closes the channels, allowing workers to exit their loops

    println!("Waiting for worker threads to flush and exit...");
    for handle in handles {
        handle.join().unwrap();
    }

    println!("Successfully split data using {} threads!", num_workers);
    Ok(())
}
