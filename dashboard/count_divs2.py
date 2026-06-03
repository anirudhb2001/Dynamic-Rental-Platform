import re

with open('src/component/Sidenav/SideNav.jsx', 'r') as f:
    lines = f.read().split('\n')

div_count = 0
for i in range(600, 978):
    line = lines[i]
    opens = len(re.findall(r'<div\b[^>]*>', line))
    closes = len(re.findall(r'</div\s*>', line))
    div_count += opens - closes
    if opens > 0 or closes > 0:
        print(f"Line {i+1}: {opens} opens, {closes} closes. Total: {div_count}")

