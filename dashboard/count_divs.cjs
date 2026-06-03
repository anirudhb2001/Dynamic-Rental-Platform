const fs = require('fs');
const content = fs.readFileSync('src/component/Sidenav/SideNav.jsx', 'utf-8');

let divCount = 0;
let lines = content.split('\n');
let inComment = false;

for (let i = 0; i < 1306; i++) {
  let line = lines[i];
  
  // Naive but better count
  // We'll count occurrences of "<div" and "</div"
  
  let opens = (line.match(/<div(\s|>)/g) || []).length;
  let closes = (line.match(/<\/div>/g) || []).length;
  
  divCount += opens - closes;
  if (opens !== closes) {
    console.log(`Line ${i + 1}: opens=${opens}, closes=${closes}, total=${divCount}`);
  }
}
