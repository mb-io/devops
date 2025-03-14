import fs from 'fs';

const dir = '.husky/_/';
if (fs.existsSync(dir)) {
  fs.rmSync(dir, { recursive: true }, (err) => {
    if (err) throw err;
  });
  console.log(dir + ' has been removed.');
}
