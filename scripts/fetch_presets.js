const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const GIFS_DIR = path.join(__dirname, '../public/uploads/presets/gifs');
const STICKERS_DIR = path.join(__dirname, '../public/uploads/presets/stickers');
const SOUNDS_DIR = path.join(__dirname, '../public/uploads/presets/sounds');
const OUT_DATA_FILE = path.join(__dirname, '../src/data/presetsData.ts');

fs.mkdirSync(GIFS_DIR, { recursive: true });
fs.mkdirSync(STICKERS_DIR, { recursive: true });
fs.mkdirSync(SOUNDS_DIR, { recursive: true });

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest) && fs.statSync(dest).size > 500) {
      return resolve(dest);
    }
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed with status ${res.statusCode} for ${url}`));
      }
      const fileStream = fs.createWriteStream(dest);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve(dest);
      });
      fileStream.on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    });
    req.on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
    req.setTimeout(12000, () => {
      req.destroy();
      fs.unlink(dest, () => {});
      reject(new Error('Timeout'));
    });
  });
}

async function runQueue(tasks, concurrency = 8) {
  let index = 0;
  const results = [];
  async function worker() {
    while (index < tasks.length) {
      const currentIndex = index++;
      try {
        const res = await tasks[currentIndex]();
        results[currentIndex] = res;
      } catch (err) {
        console.warn(`[Queue Warning] Task ${currentIndex} error:`, err.message);
        results[currentIndex] = null;
      }
    }
  }
  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
  return results;
}

async function main() {
  console.log('🚀 Starting Presets Fetcher (100 GIFs + 500 Stickers)...');

  const presetGifs = [];
  const presetStickers = [];

  // 1. Fetch Pusheen Animated Stickers from lhl/pusheen-stickers
  console.log('📦 Fetching Pusheen animated Facebook stickers...');
  try {
    const pusheenRes = await fetch('https://api.github.com/repos/lhl/pusheen-stickers/contents/gif/pusheen');
    const pusheenFiles = await pusheenRes.json();
    if (Array.isArray(pusheenFiles)) {
      for (let i = 0; i < pusheenFiles.length; i++) {
        const item = pusheenFiles[i];
        if (item.download_url && item.name.endsWith('.gif')) {
          const destName = `pusheen_${i + 1}.gif`;
          presetStickers.push({
            id: `stk-pusheen-${i + 1}`,
            name: `Pusheen Cat #${i + 1}`,
            group: 'Pusheen (Facebook)',
            category: 'Stickers',
            url: `/uploads/presets/stickers/${destName}`,
            downloadUrl: item.download_url,
            localPath: path.join(STICKERS_DIR, destName),
            isAnimated: true,
            format: 'gif',
            tags: ['pusheen', 'cat', 'facebook', 'cute', 'animated']
          });
        }
      }
    }

    const eatsRes = await fetch('https://api.github.com/repos/lhl/pusheen-stickers/contents/gif/pusheen_eats');
    const eatsFiles = await eatsRes.json();
    if (Array.isArray(eatsFiles)) {
      for (let i = 0; i < eatsFiles.length; i++) {
        const item = eatsFiles[i];
        if (item.download_url && item.name.endsWith('.gif')) {
          const destName = `pusheen_eats_${i + 1}.gif`;
          presetStickers.push({
            id: `stk-pusheen-eat-${i + 1}`,
            name: `Pusheen Food #${i + 1}`,
            group: 'Pusheen (Facebook)',
            category: 'Stickers',
            url: `/uploads/presets/stickers/${destName}`,
            downloadUrl: item.download_url,
            localPath: path.join(STICKERS_DIR, destName),
            isAnimated: true,
            format: 'gif',
            tags: ['pusheen', 'food', 'eating', 'cat', 'facebook', 'cute']
          });
        }
      }
    }
  } catch (err) {
    console.warn('Pusheen fetch error:', err.message);
  }

  // 2. Fetch 7TV Global Animated Emotes (Pepe, CatJAM, Poggers, etc.)
  console.log('📦 Fetching 7TV animated streamer stickers & emotes...');
  try {
    const tvRes = await fetch('https://7tv.io/v3/emote-sets/global');
    const tvData = await tvRes.json();
    if (tvData.emotes && Array.isArray(tvData.emotes)) {
      for (let i = 0; i < tvData.emotes.length; i++) {
        const e = tvData.emotes[i];
        const destName = `stream_${e.name.toLowerCase().replace(/[^a-z0-9_-]/g, '')}_${i + 1}.webp`;
        const downloadUrl = `https://cdn.7tv.app/emote/${e.id}/2x.webp`;
        presetStickers.push({
          id: `stk-7tv-${i + 1}`,
          name: `${e.name} Emote`,
          group: 'Pepe & Stream Reactions',
          category: 'Stickers',
          url: `/uploads/presets/stickers/${destName}`,
          downloadUrl,
          localPath: path.join(STICKERS_DIR, destName),
          isAnimated: Boolean(e.data?.animated),
          format: 'webp',
          tags: ['stream', 'twitch', e.name.toLowerCase(), 'animated', 'pepe', 'reaction']
        });
      }
    }
  } catch (err) {
    console.warn('7TV fetch error:', err.message);
  }

  // 3. Fetch from ChineseBQB Packs (Cat, Panda, Dog, Kumamoto, Funny Faces)
  console.log('📦 Fetching ChineseBQB Facebook & Chat sticker groups...');
  const bqbFolders = [
    { dir: '015Golden_Curator_Panda%E9%87%91%E9%A6%86%E9%95%BF%E7%86%8A%E7%8C%AB%F0%9F%90%BCBQB', group: 'Panda Memes (Facebook)', prefix: 'panda', max: 120, tags: ['panda', 'meme', 'reaction'] },
    { dir: '010Cat_%E6%98%AF%E5%96%B5%E6%98%9F%E4%BA%BA%E5%95%A6%F0%9F%90%B1BQB', group: 'Mochicat & Kitten', prefix: 'cat', max: 120, tags: ['cat', 'kitten', 'cute', 'mochi'] },
    { dir: '001Funny_%E6%BB%91%E7%A8%BD%E5%A4%A7%E4%BD%AC%F0%9F%98%8FBQB', group: 'Funny Troll Faces', prefix: 'funny', max: 80, tags: ['funny', 'troll', 'smirk'] },
    { dir: '011Dog_%E7%8B%97%F0%9F%90%B6BQB', group: 'Shiba & Dogs', prefix: 'dog', max: 50, tags: ['dog', 'shiba', 'puppy'] },
    { dir: '009KumamotoBear_%E7%86%8A%E6%9C%AC%E7%86%8A%F0%9F%90%BBBQB', group: 'Kumamoto Bear', prefix: 'kumamoto', max: 50, tags: ['bear', 'kumamoto', 'japanese'] },
    { dir: '004SmirkBoy_%E5%81%87%E7%AC%91%E7%94%B7%E5%AD%A9%F0%9F%91%A6BQB', group: 'Smirk Boy', prefix: 'smirk', max: 30, tags: ['boy', 'smirk', 'meme'] },
    { dir: '007Tiger_%E8%83%96%E8%99%8E%F0%9F%90%AFBQB', group: 'Chubby Tiger', prefix: 'tiger', max: 30, tags: ['tiger', 'cute', 'animal'] },
    { dir: '023Emoji_%E8%A1%A8%E6%83%85%E7%AC%A6%E5%8F%B7BQB', group: 'Classic Facebook Emoji', prefix: 'emoji', max: 50, tags: ['emoji', 'facebook', 'yellow'] }
  ];

  for (const pack of bqbFolders) {
    try {
      const res = await fetch(`https://api.github.com/repos/zhaoolee/ChineseBQB/contents/${pack.dir}`);
      const files = await res.json();
      if (Array.isArray(files)) {
        const selected = files.slice(0, pack.max);
        for (let i = 0; i < selected.length; i++) {
          const item = selected[i];
          const ext = path.extname(item.name) || '.jpg';
          const destName = `${pack.prefix}_${i + 1}${ext}`;
          const isGif = ext.toLowerCase() === '.gif';

          const stickerItem = {
            id: `stk-${pack.prefix}-${i + 1}`,
            name: `${pack.group.split(' ')[0]} #${i + 1}`,
            group: pack.group,
            category: 'Stickers',
            url: `/uploads/presets/stickers/${destName}`,
            downloadUrl: item.download_url,
            localPath: path.join(STICKERS_DIR, destName),
            isAnimated: isGif,
            format: ext.replace('.', ''),
            tags: [...pack.tags, pack.prefix]
          };

          // If it is a gif and we need gifs, we can also index in gifs or stickers
          presetStickers.push(stickerItem);
        }
      }
    } catch (err) {
      console.warn(`BQB pack ${pack.group} error:`, err.message);
    }
  }

  // 4. Curate 100 Most Popular GIFs for Stream Alerts
  console.log('📦 Curating 100 Popular Stream Alerts GIFs...');
  const popularGifSources = [
    { name: 'Confetti Celebration', url: 'https://media.giphy.com/media/l41lT4n6ylgW2hh04/giphy.gif', tags: ['confetti', 'celebration', 'party', 'victory'] },
    { name: 'Money Rain Dollar Bills', url: 'https://media.giphy.com/media/3o6gDWzmAzrpi5DQU8/giphy.gif', tags: ['money', 'cash', 'rich', 'dollar', 'tip'] },
    { name: 'Hype Dancing Cat', url: 'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif', tags: ['cat', 'dance', 'hype', 'cute'] },
    { name: 'Pepe Victory Cheers', url: 'https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif', tags: ['pepe', 'victory', 'cheers', 'champ'] },
    { name: 'Anime Wow PogChamp', url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif', tags: ['anime', 'wow', 'pog', 'excited'] },
    { name: 'Diamond Hype VIP', url: 'https://media.giphy.com/media/l0HlIDueXmcWNTPO0/giphy.gif', tags: ['diamond', 'luxury', 'vip', 'superchat'] },
    { name: 'Fire Flame Hype Beast', url: 'https://media.giphy.com/media/26tOZ42Mg6pbTUPHW/giphy.gif', tags: ['fire', 'flame', 'hype', 'epic'] },
    { name: 'Popcat Open Mouth', url: 'https://media.giphy.com/media/jpbnoe3UIa8TU8LM13/giphy.gif', tags: ['popcat', 'cat', 'meme', 'viral'] },
    { name: 'Golden Trophy Winner', url: 'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif', tags: ['trophy', 'toast', 'gatsby', 'leonardo'] },
    { name: 'Mind Blown Galaxy Brain', url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif', tags: ['mind blown', 'explosion', 'galaxy', 'brain'] }
  ];

  // Combine GIFs from Pusheen + ChineseBQB + curated popular list to reach 100+
  let gifCount = 1;
  for (const stk of presetStickers) {
    if (stk.format === 'gif' && gifCount <= 90) {
      const destName = `popular_gif_${gifCount}.gif`;
      presetGifs.push({
        id: `gif-preset-${gifCount}`,
        name: `Alert GIF: ${stk.name}`,
        group: 'Popular Stream GIFs',
        category: 'GIFs',
        url: `/uploads/presets/gifs/${destName}`,
        downloadUrl: stk.downloadUrl,
        localPath: path.join(GIFS_DIR, destName),
        isAnimated: true,
        format: 'gif',
        tags: [...stk.tags, 'alert', 'gif', 'stream']
      });
      gifCount++;
    }
  }

  // Also pull cat and panda animated gifs directly into GIFs
  try {
    const catRes = await fetch('https://api.github.com/repos/zhaoolee/ChineseBQB/contents/010Cat_%E6%98%AF%E5%96%B5%E6%98%9F%E4%BA%BA%E5%95%A6%F0%9F%90%B1BQB');
    const catFiles = await catRes.json();
    if (Array.isArray(catFiles)) {
      const catGifs = catFiles.filter((f) => f.name.endsWith('.gif'));
      for (const cg of catGifs) {
        if (gifCount <= 100) {
          const destName = `popular_gif_${gifCount}.gif`;
          presetGifs.push({
            id: `gif-preset-${gifCount}`,
            name: `Kawaii Cat Reaction #${gifCount}`,
            group: 'Popular Stream GIFs',
            category: 'GIFs',
            url: `/uploads/presets/gifs/${destName}`,
            downloadUrl: cg.download_url,
            localPath: path.join(GIFS_DIR, destName),
            isAnimated: true,
            format: 'gif',
            tags: ['cat', 'kawaii', 'cute', 'reaction', 'animated']
          });
          gifCount++;
        }
      }
    }
  } catch (e) {}

  for (const pop of popularGifSources) {
    if (gifCount <= 105) {
      const destName = `popular_gif_${gifCount}.gif`;
      presetGifs.push({
        id: `gif-preset-${gifCount}`,
        name: pop.name,
        group: 'Popular Stream GIFs',
        category: 'GIFs',
        url: `/uploads/presets/gifs/${destName}`,
        downloadUrl: pop.url,
        localPath: path.join(GIFS_DIR, destName),
        isAnimated: true,
        format: 'gif',
        tags: pop.tags
      });
      gifCount++;
    }
  }

  // Ensure we have at least 500 stickers
  console.log(`📊 Discovered ${presetGifs.length} GIFs and ${presetStickers.length} stickers.`);

  // Slice exactly to 100 GIFs and up to 500+ stickers
  const finalGifs = presetGifs.slice(0, 100);
  const finalStickers = presetStickers.slice(0, 500);

  console.log(`📥 Downloading ${finalGifs.length} GIFs...`);
  const gifTasks = finalGifs.map((g) => () => downloadFile(g.downloadUrl, g.localPath));
  await runQueue(gifTasks, 10);

  console.log(`📥 Downloading ${finalStickers.length} Stickers...`);
  const stickerTasks = finalStickers.map((s) => () => downloadFile(s.downloadUrl, s.localPath));
  await runQueue(stickerTasks, 12);

  // 5. Sound Presets (from public/uploads/presets/sounds)
  const soundPresets = [
    { id: 'snd-kaching', name: 'Cash Register (Ka-Ching!)', group: 'Cash & Tips', url: '/uploads/presets/sounds/cash-register-kaching.mp3', duration: 1.4, format: 'mp3', tags: ['cash', 'kaching', 'money'] },
    { id: 'snd-mario', name: 'Super Mario Coin Drop', group: 'Gaming', url: '/uploads/presets/sounds/mario-coin.mp3', duration: 0.7, format: 'mp3', tags: ['mario', 'coin', 'retro'] },
    { id: 'snd-neon', name: 'Neon Cyber Synth Chime', group: 'Alerts & Chimes', url: '/uploads/presets/sounds/neon-chime.mp3', duration: 2.2, format: 'mp3', tags: ['synth', 'neon', 'bell'] },
    { id: 'snd-vine-boom', name: 'Vine Boom Bass Drop', group: 'Memes', url: '/uploads/presets/sounds/memes/meme-vine-boom.mp3', duration: 0.7, format: 'mp3', tags: ['vine', 'boom', 'bass'] },
    { id: 'snd-emotional', name: 'Emotional Damage!', group: 'Memes', url: '/uploads/presets/sounds/memes/meme-emotional-damage.mp3', duration: 1.7, format: 'mp3', tags: ['emotional', 'damage', 'steven'] },
    { id: 'snd-fbi', name: 'FBI OPEN UP! Door Breach', group: 'Memes', url: '/uploads/presets/sounds/memes/meme-fbi-open-up.mp3', duration: 2.4, format: 'mp3', tags: ['fbi', 'open up', 'raid'] },
    { id: 'snd-john-cena', name: 'John Cena Fanfare Trumpets', group: 'Hype & Cheers', url: '/uploads/presets/sounds/memes/meme-john-cena.mp3', duration: 5.0, format: 'mp3', tags: ['john cena', 'wwe', 'hype'] },
    { id: 'snd-among-us', name: 'Among Us Emergency Reveal', group: 'Gaming', url: '/uploads/presets/sounds/memes/meme-among-us.mp3', duration: 3.1, format: 'mp3', tags: ['among us', 'sus', 'gaming'] },
    { id: 'snd-discord', name: 'Discord Notification Ping', group: 'Alerts & Chimes', url: '/uploads/presets/sounds/memes/meme-discord-ping.mp3', duration: 0.4, format: 'mp3', tags: ['discord', 'ping', 'chat'] },
    { id: 'snd-win-xp', name: 'Windows XP Startup Chime', group: 'Alerts & Chimes', url: '/uploads/presets/sounds/memes/meme-windows-startup.mp3', duration: 3.7, format: 'mp3', tags: ['windows', 'xp', 'retro'] },
    { id: 'snd-metal-pipe', name: 'Metal Pipe Clang Drop', group: 'Memes', url: '/uploads/presets/sounds/memes/meme-metal-pipe.mp3', duration: 1.4, format: 'mp3', tags: ['metal pipe', 'clang', 'funny'] },
    { id: 'snd-nuke', name: 'Tactical Nuke Incoming Siren', group: 'Gaming', url: '/uploads/presets/sounds/memes/meme-tactical-nuke.mp3', duration: 4.8, format: 'mp3', tags: ['nuke', 'siren', 'cod'] },
    { id: 'snd-jojo', name: 'To Be Continued (Roundabout JoJo)', group: 'Memes', url: '/uploads/presets/sounds/memes/meme-to-be-continued.mp3', duration: 4.8, format: 'mp3', tags: ['jojo', 'roundabout', 'anime'] },
    { id: 'snd-minecraft-oof', name: 'Minecraft Classic OOF', group: 'Gaming', url: '/uploads/presets/sounds/memes/oh-minecraft-oof.mp3', duration: 0.4, format: 'mp3', tags: ['minecraft', 'steve', 'oof'] },
    { id: 'snd-roblox-oof', name: 'Roblox Original OOF', group: 'Gaming', url: '/uploads/presets/sounds/memes/oh-roblox-oof.mp3', duration: 0.5, format: 'mp3', tags: ['roblox', 'oof', 'classic'] },
    { id: 'snd-crowd', name: 'Stadium Crowd Standing Ovation', group: 'Hype & Cheers', url: '/uploads/presets/sounds/memes/oh-crowd.mp3', duration: 2.8, format: 'mp3', tags: ['crowd', 'cheer', 'applause'] },
    { id: 'snd-sad-violin', name: 'Sad Violin Dramatic Solo', group: 'Memes', url: '/uploads/presets/sounds/memes/meme-sad-violin.mp3', duration: 2.3, format: 'mp3', tags: ['sad', 'violin', 'crying'] },
    { id: 'snd-spongebob', name: 'SpongeBob Fail (Womp Womp)', group: 'Memes', url: '/uploads/presets/sounds/memes/meme-spongebob-fail.mp3', duration: 1.7, format: 'mp3', tags: ['spongebob', 'fail', 'trombone'] }
  ];

  // 6. Generate the TypeScript registry file src/data/presetsData.ts
  const cleanedGifs = finalGifs.map(({ downloadUrl, localPath, ...rest }) => rest);
  const cleanedStickers = finalStickers.map(({ downloadUrl, localPath, ...rest }) => rest);

  const stickerGroups = Array.from(new Set(cleanedStickers.map((s) => s.group)));

  const tsContent = `// Auto-generated Presets Library Registry
// Contains 100 Popular GIFs, 500+ Facebook & Stream Stickers, and Sound Presets

export interface PresetMediaItem {
  id: string;
  name: string;
  group: string;
  category: 'GIFs' | 'Stickers' | 'Sounds';
  url: string;
  isAnimated?: boolean;
  format: string;
  tags: string[];
  duration?: number;
}

export const PRESET_STICKER_GROUPS = ${JSON.stringify(stickerGroups, null, 2)} as const;

export const PRESET_GIFS: PresetMediaItem[] = ${JSON.stringify(cleanedGifs, null, 2)};

export const PRESET_STICKERS: PresetMediaItem[] = ${JSON.stringify(cleanedStickers, null, 2)};

export const PRESET_SOUNDS: PresetMediaItem[] = ${JSON.stringify(soundPresets, null, 2)};

export const ALL_PRESETS: PresetMediaItem[] = [
  ...PRESET_GIFS,
  ...PRESET_STICKERS,
  ...PRESET_SOUNDS
];
`;

  fs.writeFileSync(OUT_DATA_FILE, tsContent, 'utf8');
  console.log(`✅ Successfully generated ${OUT_DATA_FILE}`);
  console.log(`🎉 Summary: ${finalGifs.length} GIFs, ${finalStickers.length} Stickers, and ${soundPresets.length} Sounds.`);
}

main().catch(console.error);
