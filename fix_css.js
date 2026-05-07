import fs from 'fs';

function fixFile(file) {
  let content = fs.readFileSync(file, 'utf-8');
  content = content.replace(/paddingVertical:\s*(\d+)/g, 'paddingTop: $1, paddingBottom: $1');
  content = content.replace(/paddingHorizontal:\s*(\d+)/g, 'paddingLeft: $1, paddingRight: $1');
  content = content.replace(/marginVertical:\s*(\d+)/g, 'marginTop: $1, marginBottom: $1');
  content = content.replace(/marginHorizontal:\s*(\d+)/g, 'marginLeft: $1, marginRight: $1');
  fs.writeFileSync(file, content);
}

fixFile('src/components/LoginScreen.tsx');
fixFile('src/components/BottomTabs.tsx');
fixFile('src/components/ToolsTab.tsx');
fixFile('src/components/ItineraryTab.tsx');
fixFile('src/components/HomeTab.tsx');
