/* Groupe Tranchant — données du site (partagées par le site, la 3D et la génération du HTML statique) */
export const IMG = 'https://www.groupetranchant.com/wp-content/uploads/';
export const PLACES = [
  { name: 'Paris Élysées Club', city: 'Paris', type: 'club', lon: 2.30, lat: 48.87, r: 'centre', url: 'https://www.paris-elysees-club.com/' },
  { name: 'Grand Casino Basel', city: 'Bâle', type: 'casino', lon: 7.53, lat: 47.59, r: 'est', url: 'https://grandcasinobasel.com/' },
  { name: 'Airport Hotel Basel', city: 'Bâle', type: 'hotel', lon: 7.53, lat: 47.59, r: 'est', url: 'https://www.airporthotelbasel.com/en/' },
  { name: 'Grand Casino Prilly', city: 'Prilly', type: 'casino', lon: 6.60, lat: 46.53, r: 'est', url: '' },
  { name: 'Seven Casino', city: 'Amnéville', type: 'casino', lon: 6.14, lat: 49.26, r: 'est', url: 'https://seven-casino.com/' },
  { name: 'Golden Tulip', city: 'Amnéville', type: 'hotel', lon: 6.14, lat: 49.26, r: 'est', url: 'https://amneville.goldentulip.com/fr-fr/' },
  { name: 'Casino de Saint-Gervais', city: 'Saint-Gervais', type: 'casino', lon: 6.71, lat: 45.89, r: 'est', url: 'https://casino-saint-gervais.fr/' },
  { name: "Casino d'Argelès-Gazost", city: 'Argelès-Gazost', type: 'casino', lon: -0.10, lat: 43.00, r: 'sud', url: 'https://casino-argeles-gazost.fr/' },
  { name: 'Casino de Bagnères-de-Bigorre', city: 'Bagnères-de-Bigorre', type: 'casino', lon: 0.15, lat: 43.07, r: 'sud', url: 'https://casino-bagneres-de-bigorre.fr/' },
  { name: 'Casino de Pau', city: 'Pau', type: 'casino', lon: -0.37, lat: 43.30, r: 'sud', url: 'https://casino-pau.fr/' },
  { name: 'Casino Terrazur', city: 'Cagnes-sur-Mer', type: 'casino', lon: 7.15, lat: 43.66, r: 'sud', url: 'https://casinoterrazur.com/' },
  { name: 'Casino Flamingos', city: 'Le-Grau-du-Roi', type: 'casino', lon: 4.14, lat: 43.54, r: 'sud', url: 'https://casino-grau-du-roi.fr/' },
  { name: 'Casino de Sète', city: 'Sète', type: 'casino', lon: 3.70, lat: 43.40, r: 'sud', url: 'https://casino-sete.fr/' },
  { name: 'Casino de Valras-Plage', city: 'Valras-Plage', type: 'casino', lon: 3.29, lat: 43.25, r: 'sud', url: 'https://casino-valras.fr/' },
  { name: 'Casino de Dunkerque', city: 'Dunkerque', type: 'casino', lon: 2.38, lat: 51.03, r: 'manche', url: 'https://casino-dunkerque.fr/' },
  { name: "Casino d'Yport", city: 'Yport', type: 'casino', lon: 0.31, lat: 49.73, r: 'manche', url: 'https://casino-yport.fr/' },
  { name: 'Casino de Villers-sur-Mer', city: 'Villers-sur-Mer', type: 'casino', lon: 0.00, lat: 49.32, r: 'manche', url: 'https://casino-villers-sur-mer.fr/' },
  { name: 'Casino de Luc-sur-Mer', city: 'Luc-sur-Mer', type: 'casino', lon: -0.35, lat: 49.31, r: 'manche', url: 'https://casino-luc-sur-mer.fr/' },
  { name: 'Casino de Roscoff', city: 'Roscoff', type: 'casino', lon: -3.98, lat: 48.71, r: 'manche', url: 'https://casino-roscoff.fr/' },
  { name: 'Casino de Néris-les-Bains', city: 'Néris-les-Bains', type: 'casino', lon: 2.66, lat: 46.29, r: 'centre', url: 'https://casino-neris-les-bains.fr/' },
  { name: 'Casino de Pougues-les-Eaux', city: 'Pougues-les-Eaux', type: 'casino', lon: 3.10, lat: 47.08, r: 'centre', url: 'https://casino-pougues-les-eaux.fr/' },
  { name: 'Hôtel des Sources', city: 'Pougues-les-Eaux', type: 'hotel', lon: 3.10, lat: 47.08, r: 'centre', url: 'https://www.hoteldessources.fr/fr/' }
];
export const FRANCE = [[2.54,51.09],[3.15,50.79],[3.7,50.3],[4.23,49.96],[4.8,49.95],[4.86,50.15],[5.8,49.55],[6.37,49.46],[7.0,49.15],[7.6,49.08],[8.22,48.97],[7.8,48.5],[7.58,48.1],[7.55,47.58],[7.0,47.45],[6.95,47.25],[6.45,46.95],[6.1,46.58],[6.13,46.25],[6.3,46.4],[6.8,46.4],[6.85,46.15],[7.0,45.9],[6.8,45.4],[7.1,45.2],[6.65,45.0],[7.0,44.7],[6.9,44.35],[7.7,44.15],[7.5,43.78],[7.0,43.55],[6.65,43.2],[6.1,43.05],[5.4,43.2],[4.85,43.35],[4.2,43.47],[3.6,43.3],[3.05,42.9],[3.17,42.43],[2.6,42.35],[1.75,42.5],[0.7,42.85],[-0.3,42.8],[-1.4,43.25],[-1.78,43.37],[-1.45,43.9],[-1.25,44.6],[-1.15,45.5],[-1.45,46.2],[-2.15,46.85],[-2.5,47.3],[-3.0,47.55],[-4.35,47.8],[-4.75,48.05],[-4.78,48.5],[-4.0,48.72],[-3.2,48.85],[-2.3,48.62],[-1.6,48.65],[-1.58,49.2],[-1.9,49.68],[-1.25,49.7],[-1.15,49.35],[-0.4,49.33],[0.1,49.43],[0.2,49.7],[1.1,49.93],[1.6,50.2],[1.58,50.75],[1.9,50.96]];
export const PHOTO = {
  'Paris Élysées Club': '2025/03/paris-pec.jpg', 'Grand Casino Basel': '2025/03/bale.jpg', 'Airport Hotel Basel': '2025/03/bale-h.jpg',
  'Grand Casino Prilly': '2026/09/casinoprilly.jpg', 'Seven Casino': '2025/03/amneville.jpg', 'Golden Tulip': '2025/03/amneville-h.jpg',
  'Casino de Saint-Gervais': '2025/03/saintgervais.jpg', "Casino d'Argelès-Gazost": '2025/03/argeles.jpg', 'Casino de Bagnères-de-Bigorre': '2025/03/bagneres.jpg',
  'Casino de Pau': '2025/03/pau.jpg', 'Casino Terrazur': '2025/03/cagnes.jpg', 'Casino Flamingos': '2025/03/grauduroi.jpg', 'Casino de Sète': '2025/03/sete.jpg',
  'Casino de Valras-Plage': '2025/03/valrasplage2.jpg', 'Casino de Dunkerque': '2025/03/dunkerque.jpg', "Casino d'Yport": '2025/08/yp2025.jpg',
  'Casino de Villers-sur-Mer': '2025/03/villerssurmer.jpg', 'Casino de Luc-sur-Mer': '2025/03/lucsurmer.jpg', 'Casino de Roscoff': '2025/03/roscoff.jpg',
  'Casino de Néris-les-Bains': '2025/03/nerislesbains.jpg', 'Casino de Pougues-les-Eaux': '2025/03/pouguesleseaux.jpg', 'Hôtel des Sources': '2025/03/pouguesleseaux-h.jpg'
};
