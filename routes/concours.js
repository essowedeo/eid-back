import { Router } from 'express';
import { readDB, writeDB } from '../db.js';

const router = Router();

// POST /api/concours - s'inscrire aux concours
router.post('/', (req, res) => {
  const { name, phone, type } = req.body;
  if (!name || !phone || !type) {
    return res.status(400).json({ error: 'Tous les champs sont requis' });
  }

  const db = readDB();
  if (!db.concours) db.concours = [];

  // Bloquer la double inscription au même concours
  const alreadyIn = db.concours.find(c => c.phone === phone.trim() && c.type === type);
  if (alreadyIn) {
    return res.status(400).json({ error: `Tu es déjà inscrit(e) au concours "${type}"` });
  }

  const registration = {
    id: db.nextConcoursId || 1,
    name: name.trim(),
    phone: phone.trim(),
    type: type, // e.g. "Dunk", "3 Points", "Autres" or an array
    paid: false,
    createdAt: new Date().toISOString()
  };

  db.concours.push(registration);
  db.nextConcoursId = (db.nextConcoursId || 1) + 1;
  writeDB(db);

  res.json({ message: 'Inscription réussie', registration });
});

// GET /api/concours/public - liste des inscrits (SANS les numéros de téléphone)
router.get('/public', (req, res) => {
  const db = readDB();
  const publicData = (db.concours || []).map(c => ({
    id: c.id,
    name: c.name,
    type: c.type,
    createdAt: c.createdAt
  }));
  res.json(publicData);
});

// POST /api/concours/search - rechercher une inscription par numéro
router.post('/search', (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Numéro requis' });

  const db = readDB();
  const found = (db.concours || []).find(c => c.phone === phone.trim());

  if (!found) return res.status(404).json({ error: 'Aucune inscription trouvée' });

  res.json(found);
});

// GET /api/concours - liste des inscrits (Admin)
router.get('/', (req, res) => {
  const db = readDB();
  res.json(db.concours || []);
});

// DELETE /api/concours/:id — supprimer un challenger
router.delete('/:id', (req, res) => {
  const db = readDB();
  const id = parseInt(req.params.id);
  
  if (!db.concours) return res.status(404).json({ error: 'Aucun inscrit' });
  
  const idx = db.concours.findIndex(c => c.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Inscrit introuvable' });
  
  db.concours.splice(idx, 1);
  writeDB(db);
  
  res.json({ success: true, message: 'Inscrit supprimé' });
});

// PUT /api/concours/:id/pay — marquer un challenger comme payé
router.put('/:id/pay', (req, res) => {
  const db = readDB();
  const id = parseInt(req.params.id);
  
  if (!db.concours) return res.status(404).json({ error: 'Aucun inscrit' });
  
  const challenger = db.concours.find(c => c.id === id);
  if (!challenger) return res.status(404).json({ error: 'Inscrit introuvable' });
  
  challenger.paid = !challenger.paid; // Toggle
  writeDB(db);
  
  res.json({ message: 'Statut de paiement mis à jour', paid: challenger.paid });
});

export default router;
