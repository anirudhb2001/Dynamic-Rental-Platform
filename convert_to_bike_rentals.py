import os
import glob

replacements = [
    ('Rent Camera Kochi', 'Bike Rentals'),
    ('Rent camera kochi', 'Bike Rentals'),
    ('#F5C725', '#E53E3E'),
    ('yellow-400', 'red-500'),
    ('yellow-500', 'red-600'),
    ('yellow-700', 'red-700'),
    ('#ffe7a6', '#fed7d7'),
    ('cameralogo', 'bikelogo'),
    ('camera_logo.png', 'bike_logo.png')
]

def replace_in_file(filepath):
    try:
        with open(filepath, 'r') as f:
            content = f.read()
            
        new_content = content
        for old, new in replacements:
            new_content = new_content.replace(old, new)
            
        if content != new_content:
            with open(filepath, 'w') as f:
                f.write(new_content)
            print(f"Updated {filepath}")
    except Exception as e:
        print(f"Error reading {filepath}: {e}")

for root, _, files in os.walk('dashboard/src'):
    for file in files:
        if file.endswith(('.jsx', '.js', '.css', '.html')):
            replace_in_file(os.path.join(root, file))

replace_in_file('dashboard/index.html')
