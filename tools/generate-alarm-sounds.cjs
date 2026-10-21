/** Genera avisos originales PCM de tres segundos con el mismo patrón que Web Audio. */
const fs = require('node:fs');
const path = require('node:path');
const sampleRate = 22050, duration = 3;
const patterns = {series:[880,880,880],rest:[1320,1320],reminder:[660,880,1100]};
const directory = path.join(__dirname,'../frontend/android/app/src/main/res/raw');
fs.mkdirSync(directory,{recursive:true});
for (const [kind,notes] of Object.entries(patterns)) {
  const samples = sampleRate * duration, data = Buffer.alloc(44 + samples*2);
  data.write('RIFF',0);data.writeUInt32LE(data.length-8,4);data.write('WAVEfmt ',8);
  data.writeUInt32LE(16,16);data.writeUInt16LE(1,20);data.writeUInt16LE(1,22);
  data.writeUInt32LE(sampleRate,24);data.writeUInt32LE(sampleRate*2,28);
  data.writeUInt16LE(2,32);data.writeUInt16LE(16,34);data.write('data',36);data.writeUInt32LE(samples*2,40);
  const segment=duration/notes.length;
  for(let i=0;i<samples;i++) {
    const time=i/sampleRate,index=Math.min(notes.length-1,Math.floor(time/segment));
    const local=time-index*segment,end=segment-(index===notes.length-1?0:.12);
    const envelope=Math.max(0,Math.min(1,local/.015,(end-local)/.04));
    data.writeInt16LE(Math.round(Math.sin(2*Math.PI*notes[index]*local)*.18*32767*envelope),44+i*2);
  }
  fs.writeFileSync(path.join(directory,`gymbro_${kind}_3s.wav`),data);
}
