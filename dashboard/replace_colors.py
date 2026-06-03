import os

files = [
    'src/component/Sidenav/SideNav.jsx',
    'src/component/CameraList/CameraList.jsx',
    'src/component/Rentlistview.jsx',
    'src/component/RentalCart/RentalCart.jsx',
    'src/component/Pagination/Pagination.jsx'
]

replacements = [
    ('purple-600', 'primary'),
    ('purple-700', 'primary/90'),
    ('purple-500/30', 'primary/30'),
    ('purple-500/50', 'primary/50'),
    ('purple-100', 'secondary/20'),
    ('purple-50', 'secondary/10'),
    ('purple-400', 'primary/70')
]

for file_path in files:
    if os.path.exists(file_path):
        with open(file_path, 'r') as f:
            content = f.read()
        for old, new in replacements:
            content = content.replace(old, new)
        with open(file_path, 'w') as f:
            f.write(content)
        print(f"Updated {file_path}")
    else:
        print(f"Skipped {file_path}")
