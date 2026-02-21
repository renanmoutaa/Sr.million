import os

file_path = ".env"
if os.path.exists(file_path):
    print(f"Index: {file_path} FOUND.")
    with open(file_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
        for line in lines:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, value = line.split("=", 1)
                masked_value = value[:5] + "..." if len(value) > 5 else "SHORT"
                print(f"Key: {key}, Value: {masked_value}")
            else:
                print(f"Skipping malformed line: {line}")
else:
    print(f"Index: {file_path} NOT FOUND in {os.getcwd()}")
