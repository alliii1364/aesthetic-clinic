// Curated photography. Every <Photo> falls back to a warm tonal gradient if a remote image fails,
// so the layout never breaks. Clinics replace these from Website CMS > Media.
const u = (id: string, w = 1600) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`

export const IMG = {
  hero: u('photo-1570172619644-dfd03ed5d881', 2000),
  facial: u('photo-1560750588-73207b1ef5b8'),
  skincare: u('photo-1616394584738-fc6e612e71b9'),
  spa: u('photo-1512290923902-8a9f81dc236c'),
  serum: u('photo-1620916566398-39f1143ab7be'),
  clinic: u('photo-1629909613654-28e377c37b09'),
  clinic2: u('photo-1519494026892-80bbd2d6fd0d'),
  portrait1: u('photo-1544005313-94ddf0286df2', 1200),
  portrait2: u('photo-1531123897727-8f129e1688ce', 1200),
  portrait3: u('photo-1508214751196-bcfd4ca60f91', 1200),
  docMale: u('photo-1622253692010-333f2da6031d', 900),
  docFemale: u('photo-1594824476967-48c8b964273f', 900),
  docFemale2: u('photo-1559839734-2b71ea197ec2', 900),
  laser: u('photo-1598440947619-2c35fc9aa908'),
  body: u('photo-1519823551278-64ac92734fb1'),
  lips: u('photo-1487412947147-5cebf100ffc2'),
  hair: u('photo-1522337360788-8b13dee7a37e'),
  wellness: u('photo-1540555700478-4be289fbecef'),
  beverly: u('photo-1600566753086-00f18fb6b3ea'),
  santamonica: u('photo-1600585154340-be6161a56a0c'),
}

const PORTRAITS = [IMG.portrait1, IMG.portrait2, IMG.portrait3]

export const avatarFor = (seed: string) => {
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return PORTRAITS[h % PORTRAITS.length]
}
