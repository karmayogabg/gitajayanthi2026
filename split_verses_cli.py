import os
import subprocess

# Local ffmpeg path in the project root
ffmpeg_path = "./ffmpeg"
input_file = "slokas/Sholka 54 to 72 adyay 2.mp4"

# Pre-populated best-estimate timestamps (in seconds)
splits = [
    {"verse": 54, "start": 5.14, "end": 23.71},
    {"verse": 55, "start": 24.59, "end": 57.07},
    {"verse": 56, "start": 57.85, "end": 71.72},
    {"verse": 57, "start": 76.85, "end": 95.56},
    {"verse": 58, "start": 96.30, "end": 117.48},
    {"verse": 59, "start": 118.21, "end": 131.26},
    {"verse": 60, "start": 132.07, "end": 154.04},
    {"verse": 61, "start": 171.31, "end": 189.29},
    {"verse": 62, "start": 193.27, "end": 206.70},
    {"verse": 63, "start": 207.51, "end": 221.39},
    {"verse": 64, "start": 222.18, "end": 235.67},
    {"verse": 65, "start": 236.66, "end": 247.51},
    {"verse": 66, "start": 252.55, "end": 267.47},
    {"verse": 67, "start": 268.48, "end": 285.00},
    {"verse": 68, "start": 285.00, "end": 302.14},
    {"verse": 69, "start": 302.97, "end": 314.05},
    {"verse": 70, "start": 314.91, "end": 322.79},
    # Note: Verses 71 and 72 appear to exceed the master audio file duration (322.79s).
    # We set them to the final segment for now, but they can be adjusted if the file changes.
    {"verse": 71, "start": 322.79, "end": 322.79},
    {"verse": 72, "start": 322.79, "end": 322.79},
]

def main():
    if not os.path.exists(input_file):
        print(f"Error: Input master file '{input_file}' not found.")
        return

    print("Starting command-line lossless audio splitting...")
    print("==================================================")
    
    success_count = 0
    for item in splits:
        output_file = f"slokas/Shloka {item['verse']} adhyay 2.mp4"
        duration = item['end'] - item['start']
        
        if duration <= 0:
            print(f"Skipping Verse {item['verse']}: Start and End times are the same ({item['start']}s).")
            continue
            
        print(f"Verse {item['verse']}: Cutting {item['start']}s -> {item['end']}s ({duration:.2f}s)...")
        
        # Lossless stream copy command using ffmpeg
        cmd = [
            ffmpeg_path, "-y",
            "-ss", str(item['start']),
            "-to", str(item['end']),
            "-i", input_file,
            "-c", "copy",
            output_file
        ]
        
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if result.returncode == 0:
            print(f"  Success: Saved to {output_file}")
            success_count += 1
        else:
            print(f"  Error: Failed to cut Verse {item['verse']}")
            print(result.stderr.decode('utf-8'))
            
    print("==================================================")
    print(f"Completed! Successfully split {success_count} verses into 'slokas/' folder.")

if __name__ == "__main__":
    main()
