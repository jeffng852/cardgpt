# Card Images

This folder contains credit card images used in CardGPT recommendations.

## 📁 Image Format Requirements

- **Format**: PNG (preferred), JPG, or JPEG
- **Naming**: Must match the card ID from `src/data/cards.json`
- **Example**: `hsbc-everymile.png`, `sc-simply-cash.png`
- **Recommended Size**: 300x200px (3:2 aspect ratio)
- **File Size**: Keep under 100KB for optimal performance

## 🚀 Adding New Card Images

### Method 1: Automated (Recommended)

1. Add your card image(s) to this folder with the correct filename:
   ```
   card_image/{card-id}.png
   ```

2. Run the automation script:
   ```bash
   npm run add-card-images
   ```

3. The script will:
   - Copy images to `public/cards/`
   - Auto-update `src/lib/cardImages.ts`
   - Show which cards still need images

### Method 2: Manual

1. Copy image to `public/cards/{card-id}.png`
2. Add the card ID to `src/lib/cardImages.ts`:
   ```typescript
   const CARDS_WITH_IMAGES = [
     'existing-card-id',
     'your-new-card-id',  // Add here
   ];
   ```

## 📋 Card IDs Reference

To find the correct card ID, check `src/data/cards.json`:
```json
{
  "cards": [
    {
      "id": "hsbc-everymile",  // ← Use this as filename
      "name": "HSBC EveryMile Card",
      ...
    }
  ]
}
```

## ✅ Current Card Images

Run `npm run add-card-images` to see the current coverage and missing images.

## 🎨 Image Guidelines

**Good Image:**
- Clear, high-resolution card image
- Proper aspect ratio (3:2 recommended)
- Consistent styling across all cards
- Optimized file size

**Image Sources:**
- Official bank websites
- Card issuer press materials
- Professional product photography

## 🔍 Verification

After adding images:

1. Start dev server:
   ```bash
   npm run dev
   ```

2. Test a query and verify:
   - Card images display correctly
   - Fallback placeholder shows for cards without images
   - Images are properly sized and aligned

## 📝 Notes

- Images are automatically copied from `card_image/` to `public/cards/` by the automation script
- The `public/cards/` folder is served by Next.js
- Keep source images in `card_image/` for version control
- Optimize images before adding (use tools like TinyPNG, ImageOptim)
