const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const dir = path.join(__dirname, '..', 'public', 'documents');
const samples = [
  { file: 'audio_sample_chi_pheo.mp3', freq: 440, name: 'Chi Pheo' },
  { file: 'audio_sample_sherlock.mp3', freq: 523.25, name: 'Sherlock Holmes' },
  { file: 'audio_sample_artofwar.mp3', freq: 392, name: 'Binh Phap Ton Tu' },
  { file: 'audio_sample_aesop.mp3', freq: 349.23, name: 'Truyen Ngu Ngon Aesop' },
  { file: 'audio_sample_frankenstein.mp3', freq: 329.63, name: 'Frankenstein' },
  { file: 'audio_sample_science_rich.mp3', freq: 493.88, name: 'Khoa Hoc Lam Giau' }
];

samples.forEach(s => {
  const outPath = path.join(dir, s.file);
  console.log('Generating audio sample:', s.file);
  // Generate 30s melodic harmonic audiobook sample
  const cmd = `ffmpeg -y -f lavfi -i "sine=frequency=${s.freq}:duration=30" -filter_complex "[0:a]volume=0.35,afade=t=in:ss=0:d=1.5,afade=t=out:st=28.5:d=1.5[a]" -map "[a]" -c:a libmp3lame -b:a 128k "${outPath}"`;
  execSync(cmd, { stdio: 'inherit' });
});
console.log('✓ Hoàn tất tạo toàn bộ tệp âm thanh sách nói mẫu thành công!');
