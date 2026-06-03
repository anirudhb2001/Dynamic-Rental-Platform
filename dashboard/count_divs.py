import re

with open('src/component/Sidenav/SideNav.jsx', 'r') as f:
    content = f.read()

lines = content.split('\n')
div_count = 0
for i, line in enumerate(lines):
    opens = len(re.findall(r'<div\b[^>]*>', line))
    closes = len(re.findall(r'</div\s*>', line))
    div_count += opens - closes
    if div_count < 0:
        print(f"Negative div count at line {i+1}: {line}")
        break

print(f"Final div count: {div_count}")
