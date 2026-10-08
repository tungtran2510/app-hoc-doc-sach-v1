const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const documentsDir = path.join(__dirname, '..', 'public', 'documents');
const tempDir = path.join(__dirname, 'temp_audio_chunks');

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Download a TTS segment
function downloadTtsChunk(text, lang, destPath) {
  return new Promise((resolve, reject) => {
    const encoded = encodeURIComponent(text);
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encoded}`;
    
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`TTS failed with status ${res.statusCode} for: ${text}`));
      }
      const stream = fs.createWriteStream(destPath);
      res.pipe(stream);
      stream.on('finish', () => {
        stream.close();
        resolve(destPath);
      });
    });
    req.on('error', (err) => reject(err));
  });
}

// Sleep helper
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const books = [
  {
    fileName: 'audio_sample_dac_nhan_tam.mp3',
    title: 'Đắc Nhân Tâm',
    lang: 'vi',
    sentences: [
      'Chào mừng quý thính giả đang lắng nghe sách nói Đắc Nhân Tâm của tác giả Dale Carnegie.',
      'Nguyên tắc số một: Không chỉ trích, oán trách hay than phiền về người khác.',
      'Nguyên tắc số hai: Hãy thành thật khen ngợi và biết ơn những điều tốt đẹp xung quanh.',
      'Nguyên tắc số ba: Hãy khơi gợi ở người khác một niềm ham muốn mãnh liệt để cùng nhau tiến bộ.',
      'Thấu hiểu nhân tâm là chìa khóa mở rộng cánh cửa thành công và hạnh phúc trọn vẹn trong cuộc đời.'
    ]
  },
  {
    fileName: 'audio_sample_truyen_kieu.mp3',
    title: 'Truyện Kiều',
    lang: 'vi',
    sentences: [
      'Chào mừng quý thính giả đang lắng nghe trích đoạn sách nói Truyện Kiều của Đại thi hào Nguyễn Du.',
      'Trăm năm trong cõi người ta, chữ tài chữ mệnh khéo là ghét nhau.',
      'Trải qua một cuộc bể dâu, những điều trông thấy mà đau đớn lòng.',
      'Lạ gì bỉ sắc tư phong, trời xanh quen thói má hồng đánh ghen.',
      'Đoạn trường tân thanh, áng văn chương bất hủ mãi trường tồn cùng non sông gấm vóc non nước Việt Nam.'
    ]
  },
  {
    fileName: 'audio_sample_chi_pheo.mp3',
    title: 'Chí Phèo',
    lang: 'vi',
    sentences: [
      'Chào mừng quý thính giả đến với tác phẩm văn học kinh điển: Chí Phèo của nhà văn Nam Cao.',
      'Hắn vừa đi vừa chửi. Bao giờ cũng thế, cứ rượu xong là hắn chửi. Bắt đầu chửi trời, có hề gì, trời có của riêng nhà nào?',
      'Rồi hắn chửi đời, cả làng Vũ Đại, và chửi đứa nào đã đẻ ra thân hắn để hắn phải khổ sở thế này.',
      'Nhưng rồi bát cháo hành ấm nóng của thị Nở đã đánh thức phần lương tri ngủ quên trong người đàn ông khốn khổ.',
      'Chí Phèo thèm lương thiện, hắn muốn làm hòa với mọi người biết bao nhiêu.'
    ]
  },
  {
    fileName: 'audio_sample_artofwar.mp3',
    title: 'Binh Pháp Tôn Tử',
    lang: 'vi',
    sentences: [
      'Chào mừng quý thính giả lắng nghe sách nói Binh Pháp Tôn Tử, tuyệt tác nghệ thuật quân sự và mưu lược kinh điển.',
      'Tôn Tử viết: Binh pháp là việc trọng đại của quốc gia, là đạo sinh tử, là đường còn hay mất, không thể không xét kĩ.',
      'Biết người biết ta, trăm trận trăm thắng. Biết ta mà không biết người, một trận thắng một trận thua.',
      'Không biết người lại không biết ta, mỗi trận giao tranh ắt gặp hiểm nguy.',
      'Bậc dụng binh tài ba lấy mưu trí đánh bại lòng người, khuất phục quân địch mà không cần giao chiến.'
    ]
  },
  {
    fileName: 'audio_sample_sherlock.mp3',
    title: 'Sherlock Holmes',
    lang: 'vi',
    sentences: [
      'Chào mừng quý thính giả đến với tác phẩm trinh thám lừng danh: Sherlock Holmes, Vụ Tai Tiếng Xứ Bohemia.',
      'Đối với Sherlock Holmes, nàng Irene Adler mãi mãi là người phụ nữ duy nhất chiếm trọn sự nể phục của ông.',
      'Bằng óc quan sát phi thường và tài suy luận sắc bén, vị thám tử tài ba số 221B phố Baker đã giải mã những bí ẩn hóc búa nhất.',
      'Một bức ảnh kỳ lạ, một bức thư đe dọa, và cuộc đấu trí nghẹt thở giữa Holmes và người phụ nữ thông minh tuyệt đỉnh bắt đầu.'
    ]
  },
  {
    fileName: 'audio_sample_aesop.mp3',
    title: 'Ngụ Ngôn Aesop',
    lang: 'vi',
    sentences: [
      'Chào mừng các bạn đến với kho tàng Truyện Ngụ Ngôn Aesop, những câu chuyện đạo đức và trí tuệ sâu sắc.',
      'Câu chuyện Con rùa và Thỏ: Thỏ tự phụ cậy mình chạy nhanh nên đã ngủ quên dưới gốc cây xanh mát.',
      'Trong khi đó, chú rùa kiên trì, từng bước vững vàng đã về tới đích trước sự ngỡ ngàng của muôn loài.',
      'Bài học rút ra: Chậm mà chắc, kiên trì và khiêm tốn sẽ luôn dẫn lối đến chiến thắng bền lâu.'
    ]
  },
  {
    fileName: 'audio_sample_frankenstein.mp3',
    title: 'Frankenstein',
    lang: 'vi',
    sentences: [
      'Chào mừng bạn lắng nghe tiểu thuyết kinh điển khoa học viễn tưởng Frankenstein của nữ nhà văn Mary Shelley.',
      'Bức thư mở đầu của thuyền trưởng Walton gửi về cho người em gái thân yêu từ những vùng biển băng giá phương Bắc.',
      'Câu chuyện về tiến sĩ Frankenstein và sự sáng tạo vượt quá ranh giới tự nhiên đã mở ra tấn bi kịch về thân phận và sự cô độc.',
      'Một kiệt tác văn học rung động sâu xa về tình người, trách nhiệm và nỗi đau của sự cô đơn tột cùng.'
    ]
  },
  {
    fileName: 'audio_sample_science_rich.mp3',
    title: 'Khoa Học Làm Giàu',
    lang: 'vi',
    sentences: [
      'Chào mừng bạn đến với sách nói Khoa Học Làm Giàu của tác giả Wallace D. Wattles.',
      'Làm giàu là một môn khoa học chính xác, tuân theo những quy luật tự nhiên bất biến như toán học và vật lý.',
      'Bất cứ ai học cách suy nghĩ và hành động theo phương thức chính xác nhất định này đều chắc chắn sẽ trở nên thịnh vượng.',
      'Hãy kiến tạo giá trị thực sự cho người khác, nuôi dưỡng lòng biết ơn sâu sắc và kiên định với tầm nhìn của chính bạn.'
    ]
  }
];

async function generateAll() {
  console.log('=== BẮT ĐẦU TẠO GIỌNG ĐỌC SÁCH NÓI THẬT (REPLACE SINE-WAVE BEEP) ===');
  
  for (const book of books) {
    console.log(`\n--- Đang xử lý: ${book.title} -> ${book.fileName} ---`);
    const chunkFiles = [];
    
    for (let i = 0; i < book.sentences.length; i++) {
      const sentence = book.sentences[i];
      const chunkPath = path.join(tempDir, `chunk_${book.fileName}_${i}.mp3`);
      console.log(`  [${i + 1}/${book.sentences.length}] Tải giọng đọc câu: "${sentence.slice(0, 35)}..."`);
      await downloadTtsChunk(sentence, book.lang, chunkPath);
      chunkFiles.push(chunkPath);
      await sleep(250); // Be courteous to endpoint
    }
    
    // Create concat manifest
    const listFile = path.join(tempDir, `list_${book.fileName}.txt`);
    const listContent = chunkFiles.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n');
    fs.writeFileSync(listFile, listContent, 'utf8');
    
    const finalDest = path.join(documentsDir, book.fileName);
    
    // Concat and re-encode to clean MP3
    const ffmpegCmd = `ffmpeg -y -f concat -safe 0 -i "${listFile}" -c:a libmp3lame -b:a 128k -ar 44100 "${finalDest}"`;
    execSync(ffmpegCmd, { stdio: 'pipe' });
    
    const stat = fs.statSync(finalDest);
    console.log(`  => XONG: ${book.fileName} (${stat.size} bytes)`);
  }
  
  // Clean temp files
  try {
    const tempFiles = fs.readdirSync(tempDir);
    for (const file of tempFiles) {
      fs.unlinkSync(path.join(tempDir, file));
    }
    fs.rmdirSync(tempDir);
  } catch (err) {
    // Ignore cleanup error
  }
  
  console.log('\n=== TẤT CẢ 8 SÁCH NÓI ĐÃ ĐƯỢC THAY THẾ BẰNG GIỌNG ĐỌC THẬT THÀNH CÔNG! ===');
}

generateAll().catch(err => {
  console.error('Lỗi khi tạo sách nói:', err);
  process.exit(1);
});
