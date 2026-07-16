import os
import subprocess

# Local ffmpeg path in the project root
ffmpeg_path = "./ffmpeg"
input_file = "slokas/Sholka 54 to 72 adyay 2.mp4"

# Highly precise timestamps mapped from micro-speech segments
splits = [
    {"verse": 54, "start": 5.14, "end": 27.94},    # Includes "Arjuna Uvaca" + Verse 54 + number "54"
    {"verse": 55, "start": 28.35, "end": 57.07},   # Includes "Sri Bhagavanuvaca" + Verse 55 + number "55"
    {"verse": 56, "start": 57.85, "end": 76.12},   # Includes Verse 56 + number "56"
    {"verse": 57, "start": 76.85, "end": 95.56},   # Includes Verse 57 + number "57"
    {"verse": 58, "start": 96.30, "end": 117.48},  # Includes Verse 58 + number "58"
    {"verse": 59, "start": 118.21, "end": 135.04}, # Includes Verse 59 + number "59"
    {"verse": 60, "start": 135.71, "end": 158.17}, # Includes Verse 60 + number "60"
    {"verse": 61, "start": 158.94, "end": 177.96}, # Includes Verse 61 + number "61"
    {"verse": 62, "start": 178.88, "end": 196.39}, # Includes Verse 62 + number "62"
    {"verse": 63, "start": 196.98, "end": 213.92}, # Includes Verse 63 + number "63"
    {"verse": 64, "start": 214.70, "end": 232.35}, # Includes Verse 64 + number "64"
    {"verse": 65, "start": 232.89, "end": 255.72}, # Includes Verse 65 + number "65"
    {"verse": 66, "start": 256.31, "end": 275.15}, # Includes Verse 66 + number "66"
    {"verse": 67, "start": 275.64, "end": 288.55}, # Includes Verse 67 + number "67"
    {"verse": 68, "start": 289.04, "end": 306.65}, # Includes Verse 68 + number "68"
    {"verse": 69, "start": 307.05, "end": 317.69}, # Includes Verse 69 + number "69"
    {"verse": 70, "start": 318.79, "end": 322.79}, # Start of Verse 70 (file ends here)
    {"verse": 71, "start": 322.79, "end": 322.79}, # final / empty
    {"verse": 72, "start": 322.79, "end": 322.79}, # final / empty
]

def main():
    if not os.path.exists(input_file):
        print(f"Error: Input master file '{input_file}' not found.")
        return

    print("Starting highly precise command-line audio splitting...")
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
    print(f"Completed! Successfully split {success_count} verses into 'slokas/' folder with precise cuts.")

if __name__ == "__main__":
    main()
