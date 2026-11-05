import os
import math
import shutil
import numpy as np
import imageio
from PIL import Image, ImageFilter
from skimage.segmentation import watershed
from scipy import ndimage

INPUT_PATH = '/Users/hochenheng/.gemini/antigravity/brain/664b31f3-8729-4053-a016-1c951d4d1e72/.user_uploaded/media_1793900552732_0e0a10d8.jpg'
OUTPUT_DIR = '/Users/hochenheng/Desktop/StreamService/public/mlbb'
DIST_DIR = '/Users/hochenheng/Desktop/StreamService/dist/mlbb'
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(DIST_DIR, exist_ok=True)

emotes = [
    # Row 0
    ('layla_hi', 'Layla Hi! Wave', 'wave', ['hi', 'hello', 'wave', 'greeting']),
    ('layla_love_heart', 'Layla Love Heart', 'heartbeat', ['love', 'heart', 'adore']),
    ('layla_laugh_tears', 'Layla Laugh Cry', 'laugh', ['laugh', 'lol', 'funny', 'tears']),
    ('layla_cool_sunglasses', 'Layla Cool Gun', 'cool', ['cool', 'sunglasses', 'fingergun', 'slick']),
    ('layla_crown_sunglasses', 'Layla Crown Boss', 'bounce', ['crown', 'king', 'queen', 'boss', 'cool']),
    ('layla_angry_rage', 'Layla Angry Fire', 'rage', ['angry', 'rage', 'fire', 'mad']),
    ('layla_sleeping_zzz', 'Layla Sleep Nightcap', 'sleep', ['sleep', 'zzz', 'tired', 'nap']),
    ('layla_thinking', 'Layla Thinking', 'think', ['think', 'hmm', 'curious', 'wonder']),
    
    # Row 1
    ('layla_cry_waterfall', 'Layla Waterfall Cry', 'cry', ['cry', 'sad', 'tears', 'waterfall']),
    ('layla_shy_blush', 'Layla Shy Blush', 'blush', ['shy', 'blush', 'cute', 'sweet']),
    ('layla_angry_pout', 'Layla Angry Pout', 'pout', ['pout', 'angry', 'grumpy', 'mad']),
    ('layla_shocked_gasp', 'Layla Shocked OMG', 'shock', ['shock', 'omg', 'surprise', 'gasp']),
    ('layla_thank_you', 'Layla Thank You Sign', 'present', ['thank', 'thanks', 'sign', 'gratitude']),
    ('layla_peek_heart', 'Layla Peek Love', 'peek', ['peek', 'hide', 'heart', 'love']),
    ('layla_star_eyes', 'Layla Star Eyes Hype', 'hype', ['stars', 'excited', 'hype', 'sparkle']),
    ('layla_giggle', 'Layla Giggle Chuckle', 'chuckle', ['giggle', 'chuckle', 'laugh', 'cute']),
    
    # Row 2
    ('layla_question', 'Layla Confused Question', 'confuse', ['question', 'confused', 'what', 'curious']),
    ('layla_boba_tea', 'Layla Drinking Boba', 'drink', ['boba', 'milktea', 'drink', 'yum']),
    ('layla_eating_burger', 'Layla Eating Burger', 'eat', ['burger', 'food', 'eat', 'hungry']),
    ('layla_gaming_controller', 'Layla Gaming Controller', 'game', ['game', 'controller', 'play', 'gamer']),
    ('layla_furious_flames', 'Layla Furious Flames', 'flames', ['fire', 'flames', 'rage', 'furious']),
    ('layla_scared_ghost', 'Layla Scared Ghost', 'scared', ['scared', 'fear', 'ghost', 'shock']),
    ('layla_hug_heart', 'Layla Hugging Heart', 'hug_heart', ['hug', 'heart', 'love', 'cherish']),
    ('layla_glowsticks_cheer', 'Layla Concert Glowsticks', 'cheer', ['glowstick', 'concert', 'cheer', 'rave']),
    
    # Row 3
    ('layla_cry_head_down', 'Layla Weeping Sad', 'weep', ['cry', 'sad', 'weep', 'tears']),
    ('layla_boxer_punch', 'Layla Boxer Punch', 'punch', ['punch', 'fight', 'boxing', 'combat']),
    ('layla_wall_peek', 'Layla Wall Peek', 'wall_peek', ['peek', 'wall', 'spy', 'look']),
    ('layla_cozy_blanket_cat', 'Layla Cozy Blanket Cat', 'cozy', ['blanket', 'cat', 'cozy', 'sleep', 'warm']),
    ('layla_sick_thermometer', 'Layla Sick Fever', 'sick', ['sick', 'fever', 'thermometer', 'cold']),
    ('layla_demon_rage', 'Layla Demon Rage', 'demon_rage', ['rage', 'demon', 'furious', 'evil', 'fire']),
    ('layla_dizzy_spiral', 'Layla Dizzy Swirl', 'dizzy', ['dizzy', 'swirl', 'confused', 'faint']),
    ('layla_stunned_exclamation', 'Layla Stunned OMG', 'stunned', ['stunned', 'shocked', 'exclamation', 'gasp']),
    
    # Row 4
    ('layla_celebrate_popper', 'Layla Party Popper', 'celebrate', ['party', 'popper', 'celebrate', 'congrats']),
    ('layla_champion_trophy', 'Layla Golden Trophy', 'trophy', ['trophy', 'champion', 'win', 'gold', 'victory']),
    ('layla_pillow_sleep', 'Layla Hugging Pillow', 'sleep_pillow', ['pillow', 'sleep', 'rest', 'cozy']),
    ('layla_ready_to_fight', 'Layla Ready To Fight', 'fight', ['fight', 'clench', 'ready', 'brawl']),
    ('layla_petting_cat', 'Layla Petting Cat', 'pet_cat', ['cat', 'pet', 'cute', 'kitten', 'love']),
    ('layla_rocket_ride', 'Layla Rocket Ride', 'rocket', ['rocket', 'blastoff', 'fly', 'speed', 'zoom']),
    ('layla_praying_hands', 'Layla Praying Please', 'pray', ['pray', 'please', 'beg', 'hope', 'wish']),
    ('layla_gg_crown', 'Layla GG Crown', 'gg', ['gg', 'goodgame', 'crown', 'win', 'victory']),
    
    # Row 5
    ('layla_hug_kitty_heart', 'Layla Hugging Kitten', 'hug_cat', ['kitty', 'cat', 'hug', 'love', 'heart']),
    ('layla_thumbs_up', 'Layla Thumbs Up Wink', 'thumbs_up', ['thumbsup', 'ok', 'good', 'wink', 'approve']),
    ('layla_cheerleader_pompoms', 'Layla Cheerleader PomPoms', 'pompoms', ['cheer', 'pompom', 'dance', 'yay']),
    ('layla_ledge_peek', 'Layla Ledge Peek', 'ledge_peek', ['peek', 'ledge', 'curious', 'look']),
    ('layla_drinking_soda', 'Layla Chugging Soda', 'soda', ['soda', 'drink', 'can', 'refresh']),
    ('layla_mad_pout', 'Layla Grumpy Mad', 'grumpy', ['mad', 'grumpy', 'anger', 'pout']),
    ('layla_sparkle_plead', 'Layla Sparkle Begging', 'sparkle_plead', ['plead', 'beg', 'sparkle', 'cute', 'eyes']),
    ('layla_angel_rip', 'Layla Angel RIP', 'angel_rip', ['rip', 'dead', 'angel', 'halo', 'tombstone'])
]

print('Loading image...')
img = Image.open(INPUT_PATH)
rgb = np.array(img)
gray = np.array(img.convert('L'))
h, w = gray.shape

fg_mask = gray > 18
row_y = [65, 185, 300, 415, 525, 635]
col_x = [70, 205, 330, 455, 575, 705, 835, 960]

markers = np.zeros((h, w), dtype=np.int32)
marker_id = 1
for r in range(6):
    for c in range(8):
        cy, cx = row_y[r], col_x[c]
        markers[cy-4:cy+5, cx-4:cx+5] = marker_id
        marker_id += 1

print('Running watershed segmentation...')
dist = ndimage.distance_transform_edt(fg_mask)
labels = watershed(-dist, markers, mask=fg_mask)

# Reassign any disconnected foreground islands (like the 'Hi!' text and exclamation marks) to nearest sticker
print('Reassigning floating foreground text/islands to closest sticker...')
_, nearest_idx = ndimage.distance_transform_edt(labels == 0, return_indices=True)
full_labels = labels[nearest_idx[0], nearest_idx[1]]
labels = np.where(fg_mask, full_labels, 0)

TARGET_SIZE = 256
MAX_DIM = 224
N_FRAMES = 16

def get_animation_transform(anim_type, t):
    """
    Returns (angle_degrees, dx, dy, scale_x, scale_y) for a given animation type and phase t (0..2*pi)
    """
    angle = 0.0
    dx = 0
    dy = 0
    scale_x = 1.0
    scale_y = 1.0

    if anim_type == 'wave':
        angle = 5.0 * math.sin(t)
        dy = int(3.5 * math.cos(t))
        dx = int(1.5 * math.sin(t))
    elif anim_type == 'heartbeat':
        pulse = (math.exp(math.sin(t * 2)) - 1) / (math.e - 1)
        scale_x = 1.0 + 0.08 * pulse
        scale_y = 1.0 + 0.08 * pulse
        angle = 2.0 * math.sin(t)
    elif anim_type == 'laugh':
        dy = int(-6.0 * abs(math.sin(t * 2)))
        angle = 3.5 * math.sin(t * 3)
    elif anim_type == 'cool':
        angle = 4.0 * math.sin(t)
        dx = int(4.0 * math.cos(t))
        dy = int(2.0 * math.sin(t))
    elif anim_type == 'bounce':
        dy = int(-7.5 * abs(math.sin(t)))
        scale_x = 1.0 + 0.04 * math.cos(t)
        scale_y = 1.0 - 0.04 * math.cos(t)
    elif anim_type == 'rage':
        dx = int(3.5 * math.sin(t * 5))
        dy = int(3.5 * math.cos(t * 4))
        scale_x = 1.0 + 0.05 * math.sin(t * 2)
        scale_y = 1.0 + 0.05 * math.sin(t * 2)
    elif anim_type == 'sleep':
        dy = int(5.0 * math.sin(t))
        angle = 2.5 * math.sin(t)
        scale_y = 1.0 + 0.03 * math.sin(t)
    elif anim_type == 'think':
        angle = 6.0 * math.sin(t)
        dy = int(2.0 * math.cos(t))
    elif anim_type == 'cry':
        dy = int(-5.0 * abs(math.sin(t * 2)))
        angle = 3.0 * math.sin(t)
    elif anim_type == 'blush':
        angle = 4.0 * math.sin(t)
        scale_y = 1.0 + 0.04 * math.cos(t)
    elif anim_type == 'pout':
        angle = -4.0 * math.sin(t)
        dy = int(-4.0 * abs(math.sin(t)))
    elif anim_type == 'shock':
        recoil = (1.0 - math.cos(t)) / 2.0
        scale_x = 1.0 + 0.07 * recoil
        scale_y = 1.0 + 0.07 * recoil
        dx = int(2.0 * math.sin(t * 4))
    elif anim_type == 'present':
        dy = int(5.5 * math.sin(t))
        angle = 3.0 * math.cos(t)
    elif anim_type == 'peek':
        dy = int(7.0 * math.sin(t))
        angle = 3.0 * math.cos(t)
    elif anim_type == 'hype':
        dy = int(-8.0 * abs(math.sin(t * 2)))
        angle = 4.5 * math.sin(t * 2)
        scale_x = 1.0 + 0.06 * math.sin(t * 2)
        scale_y = 1.0 + 0.06 * math.sin(t * 2)
    elif anim_type == 'chuckle':
        dy = int(-4.5 * abs(math.sin(t * 3)))
        angle = 2.5 * math.sin(t * 3)
    elif anim_type == 'confuse':
        angle = 7.5 * math.sin(t)
        dy = int(2.0 * math.cos(t))
    elif anim_type == 'drink':
        angle = -5.0 * math.sin(t)
        dy = int(3.0 * math.cos(t * 2))
    elif anim_type == 'eat':
        scale_y = 1.0 + 0.05 * math.sin(t * 3)
        scale_x = 1.0 - 0.03 * math.sin(t * 3)
    elif anim_type == 'game':
        dx = int(3.0 * math.sin(t * 6))
        dy = int(2.5 * math.cos(t * 5))
        angle = 3.0 * math.sin(t * 2)
    elif anim_type == 'flames':
        pulse = 1.0 + 0.07 * math.sin(t * 2)
        scale_x = pulse
        scale_y = pulse
        dx = int(3.0 * math.sin(t * 4))
        dy = int(2.0 * math.cos(t * 4))
    elif anim_type == 'scared':
        dx = int(2.5 * math.sin(t * 7))
        dy = int(2.5 * math.cos(t * 6))
    elif anim_type == 'hug_heart':
        scale_x = 1.0 + 0.06 * math.sin(t)
        scale_y = 1.0 - 0.04 * math.sin(t)
        angle = 3.0 * math.sin(t)
    elif anim_type == 'cheer':
        angle = 8.0 * math.sin(t)
        dy = int(-5.0 * abs(math.sin(t * 2)))
    elif anim_type == 'weep':
        dy = int(-4.0 * abs(math.sin(t * 2)))
        angle = 3.0 * math.sin(t)
    elif anim_type == 'punch':
        dx = int(8.0 * math.sin(t))
        scale_x = 1.0 + 0.06 * max(0, math.sin(t))
        scale_y = 1.0 + 0.06 * max(0, math.sin(t))
    elif anim_type == 'wall_peek':
        dx = int(8.0 * math.sin(t))
        angle = 3.0 * math.sin(t)
    elif anim_type == 'cozy':
        scale_y = 1.0 + 0.04 * math.sin(t)
        dy = int(3.0 * math.sin(t))
    elif anim_type == 'sick':
        angle = 5.0 * math.sin(t)
        dx = int(1.5 * math.sin(t * 6))
    elif anim_type == 'demon_rage':
        dx = int(4.0 * math.sin(t * 5))
        dy = int(3.0 * math.cos(t * 4))
        scale_x = 1.0 + 0.06 * math.sin(t * 2)
        scale_y = 1.0 + 0.06 * math.sin(t * 2)
    elif anim_type == 'dizzy':
        dx = int(5.0 * math.sin(t))
        dy = int(4.0 * math.cos(t))
        angle = 7.0 * math.sin(t)
    elif anim_type == 'stunned':
        dx = int(2.0 * math.sin(t * 5))
        dy = int(-3.0 * abs(math.sin(t)))
    elif anim_type == 'celebrate':
        dy = int(-9.0 * abs(math.sin(t)))
        angle = 5.0 * math.sin(t * 2)
    elif anim_type == 'trophy':
        dy = int(-6.0 * math.sin(t))
        angle = 4.0 * math.sin(t)
    elif anim_type == 'sleep_pillow':
        dy = int(4.0 * math.sin(t))
        scale_y = 1.0 + 0.03 * math.sin(t)
    elif anim_type == 'fight':
        dy = int(-6.0 * abs(math.sin(t * 2)))
        angle = 3.0 * math.sin(t)
    elif anim_type == 'pet_cat':
        angle = 4.0 * math.sin(t)
        dy = int(2.5 * math.cos(t))
    elif anim_type == 'rocket':
        dx = int(2.0 * math.sin(t * 6))
        angle = -6.0 + 3.0 * math.sin(t)
        dy = int(5.0 * math.cos(t))
    elif anim_type == 'pray':
        dy = int(4.0 * math.sin(t))
        angle = 2.5 * math.sin(t)
    elif anim_type == 'gg':
        angle = 4.0 * math.cos(t)
        dy = int(-5.0 * abs(math.sin(t)))
    elif anim_type == 'hug_cat':
        scale_x = 1.0 + 0.05 * math.sin(t)
        scale_y = 1.0 - 0.03 * math.sin(t)
        angle = 3.0 * math.sin(t)
    elif anim_type == 'thumbs_up':
        angle = 4.0 * math.sin(t)
        scale_x = 1.0 + 0.05 * max(0, math.sin(t))
        scale_y = 1.0 + 0.05 * max(0, math.sin(t))
    elif anim_type == 'pompoms':
        angle = 9.0 * math.sin(t)
        dy = int(-6.0 * abs(math.sin(t * 2)))
    elif anim_type == 'ledge_peek':
        dy = int(-7.0 * max(0, math.sin(t)))
        angle = 3.0 * math.cos(t)
    elif anim_type == 'soda':
        angle = -6.0 * math.sin(t)
        scale_y = 1.0 + 0.04 * math.cos(t * 2)
    elif anim_type == 'grumpy':
        dx = int(2.5 * math.sin(t * 4))
        dy = int(-3.0 * abs(math.sin(t)))
    elif anim_type == 'sparkle_plead':
        scale_x = 1.0 + 0.06 * math.sin(t)
        scale_y = 1.0 + 0.06 * math.sin(t)
        angle = 4.0 * math.sin(t)
    elif anim_type == 'angel_rip':
        dy = int(6.0 * math.sin(t))
        angle = 2.0 * math.sin(t)
    else:
        dy = int(4.0 * math.sin(t))
        angle = 3.0 * math.sin(t)

    return angle, dx, dy, scale_x, scale_y

for idx, (emote_id, emote_name, anim_type, tags) in enumerate(emotes, start=1):
    mask = (labels == idx)
    pts = np.argwhere(mask)
    if len(pts) == 0:
        print(f'Warning: Sticker {idx} empty!')
        continue

    y0, x0 = pts.min(axis=0)
    y1, x1 = pts.max(axis=0) + 1

    crop_rgb = rgb[y0:y1, x0:x1].copy()
    crop_mask = mask[y0:y1, x0:x1]
    crop_gray = gray[y0:y1, x0:x1]

    # Clean alpha mask with subtle anti-aliased edge
    alpha = np.zeros_like(crop_mask, dtype=np.float32)
    alpha[crop_mask] = 1.0
    edge_ramp = np.clip((crop_gray.astype(np.float32) - 4) / 22.0, 0, 1)
    alpha = alpha * edge_ramp
    alpha_u8 = (alpha * 255).astype(np.uint8)

    rgba = np.dstack([crop_rgb, alpha_u8])
    sticker_img = Image.fromarray(rgba)

    # Scale to fit standard 256x256 display canvas
    sw, sh = sticker_img.size
    scale = MAX_DIM / max(sw, sh)
    nw = int(sw * scale)
    nh = int(sh * scale)
    scaled_sticker = sticker_img.resize((nw, nh), Image.Resampling.LANCZOS)

    # 1. Save pristine static high display PNG (256x256)
    png_canvas = Image.new('RGBA', (TARGET_SIZE, TARGET_SIZE), (0, 0, 0, 0))
    pox = (TARGET_SIZE - nw) // 2
    poy = (TARGET_SIZE - nh) // 2
    png_canvas.paste(scaled_sticker, (pox, poy), scaled_sticker)
    png_path = os.path.join(OUTPUT_DIR, f'{emote_id}.png')
    png_canvas.save(png_path)

    # 2. Generate 16-frame reaction-based animation
    frames = []
    for f in range(N_FRAMES):
        t = (f / N_FRAMES) * 2 * math.pi
        angle, dx, dy, scale_x, scale_y = get_animation_transform(anim_type, t)

        # Scale if needed
        cur_w = int(nw * scale_x)
        cur_h = int(nh * scale_y)
        if cur_w != nw or cur_h != nh:
            frame_sticker = scaled_sticker.resize((cur_w, cur_h), Image.Resampling.BILINEAR)
        else:
            frame_sticker = scaled_sticker

        # Rotate if needed
        if abs(angle) > 0.05:
            rotated = frame_sticker.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)
        else:
            rotated = frame_sticker

        rw, rh = rotated.size
        frame = Image.new('RGBA', (TARGET_SIZE, TARGET_SIZE), (0, 0, 0, 0))
        paste_x = (TARGET_SIZE - rw) // 2 + dx
        paste_y = (TARGET_SIZE - rh) // 2 + dy
        frame.paste(rotated, (paste_x, paste_y), rotated)
        frames.append(np.array(frame))

    # Save animated transparent GIF with full colors and zero black background
    gif_path = os.path.join(OUTPUT_DIR, f'{emote_id}.gif')
    imageio.mimsave(
        gif_path,
        frames,
        duration=50,
        loop=0,
        disposal=2
    )

    # Sync to dist/mlbb
    shutil.copy2(png_path, os.path.join(DIST_DIR, f'{emote_id}.png'))
    shutil.copy2(gif_path, os.path.join(DIST_DIR, f'{emote_id}.gif'))

    print(f'[{idx:02d}/48] Done: {emote_id}.png & {emote_id}.gif (reaction: {anim_type})')

print('All 48 Layla MLBB emotes successfully created in public/mlbb/ and dist/mlbb/!')
