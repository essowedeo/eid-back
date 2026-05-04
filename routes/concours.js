import { Router } from 'express';
import { Concours } from '../db.js';

const router = Router();

// POST /api/concours - s'inscrire aux concours
router.post('/', async (req, res) => {
  try {
    const { name, phone, type } = req.body;
    if (!name || !phone || !type) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }

    // Bloquer la double inscription au même concours
    const alreadyIn = await Concours.findOne({ 
      where: { phone: phone.trim(), type } 
    });
    
    if (alreadyIn) {
      return res.status(400).json({ error: `Tu es déjà inscrit(e) au concours "${type}"` });
    }

    const registration = await Concours.create({
      name: name.trim(),
      phone: phone.trim(),
      type: type,
      paid: false
    });

    res.status(201).json({ message: 'Inscription réussie', registration: registration.toJSON() });
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de l'inscription" });
  }
});

// GET /api/concours/public - liste des inscrits (SANS les numéros de téléphone)
router.get('/public', async (req, res) => {
  try {
    const concours = await Concours.findAll();
    const publicData = concours.map(c => {
      const data = c.toJSON();
      return {
        id: data.id,
        name: data.name,
        type: data.type,
        createdAt: data.createdAt
      };
    });
    res.json(publicData);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/concours/search - rechercher une inscription par numéro
router.post('/search', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Numéro requis' });

    const found = await Concours.findOne({ where: { phone: phone.trim() } });

    if (!found) return res.status(404).json({ error: 'Aucune inscription trouvée' });

    res.json(found.toJSON());
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET /api/concours - liste des inscrits (Admin)
router.get('/', async (req, res) => {
  try {
    const concours = await Concours.findAll();
    res.json(concours.map(c => c.toJSON()));
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// DELETE /api/concours/:id — supprimer un challenger
router.delete('/:id', async (req, res) => {
  try {
    const challenger = await Concours.findByPk(req.params.id);
    if (!challenger) return res.status(404).json({ error: 'Inscrit introuvable' });
    
    await challenger.destroy();
    res.json({ success: true, message: 'Inscrit supprimé' });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// PUT /api/concours/:id/pay — marquer un challenger comme payé
router.put('/:id/pay', async (req, res) => {
  try {
    const challenger = await Concours.findByPk(req.params.id);
    if (!challenger) return res.status(404).json({ error: 'Inscrit introuvable' });
    
    challenger.paid = !challenger.paid; // Toggle
    await challenger.save();
    
    res.json({ message: 'Statut de paiement mis à jour', paid: challenger.paid });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
