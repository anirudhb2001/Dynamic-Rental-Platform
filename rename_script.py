import os

replacements = [
    ('CameraList', 'RentalAssetList'),
    ('CameraDetails', 'RentalAssetDetails'),
    ('cameraList', 'rentalAssetList'),
    ('getCameraList', 'getRentalAssetList'),
    ('cameras', 'rentalAssets'),
    ('selectedCamera', 'selectedAsset'),
    ('cameraData', 'assetData'),
    ('camera', 'asset')
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
        pass

for root, _, files in os.walk('dashboard/src'):
    for file in files:
        if file.endswith(('.jsx', '.js')):
            replace_in_file(os.path.join(root, file))

