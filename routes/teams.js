import { Router } from 'express';
import { Team, Player } from '../db.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

function generateCode() {
  return uuidv4().replace(/-/g, '').toUpperCase().slice(0, 6);
}

// GET /api/teams — liste publique
router.get('/', async (req, res) => {
  try {
    const teams = await Team.findAll({ include: Player });
    const result = teams.map(t => {
      const team = t.toJSON();
      return {
        id: team.id,
        name: team.name,
        captainName: team.captainName,
        code: team.code,
        // secretCode intentionnellement exclu de la liste publique
        createdAt: team.createdAt,
        paid: team.paid || false,
        playerCount: team.Players.length,
        confirmedCount: team.Players.filter(p => p.status === 'confirmed').length,
      };
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET /api/teams/:code — détail équipe
router.get('/:code', async (req, res) => {
  try {
    const team = await Team.findOne({ 
      where: { code: req.params.code.toUpperCase() },
      include: Player 
    });
    
    if (!team) return res.status(404).json({ error: 'Équipe introuvable' });
    
    const teamData = team.toJSON();
    // SÉCURITÉ : Ne pas renvoyer le code secret dans la réponse publique
    const { secretCode, Players, ...teamPublic } = teamData;
    res.json({ ...teamPublic, players: Players });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/teams/:code/auth — vérifier le code secret
router.post('/:code/auth', async (req, res) => {
  try {
    const { secretCode } = req.body;
    const team = await Team.findOne({ where: { code: req.params.code.toUpperCase() } });
    
    if (!team) return res.status(404).json({ error: 'Équipe introuvable' });
    
    if (team.secretCode === secretCode.trim()) {
      res.json({ success: true, message: 'Accès autorisé' });
    } else {
      res.status(401).json({ error: 'Code secret incorrect' });
    }
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/teams — créer une équipe
router.post('/', async (req, res) => {
  try {
    const { teamName, captainName, phone, secretCode } = req.body;
    if (!teamName || !captainName || !phone || !secretCode) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }
    
    // Check existing name
    const existing = await Team.findOne({ where: { name: teamName.trim() } });
    if (existing) {
      return res.status(400).json({ error: "Ce nom d'équipe est déjà pris" });
    }

    // Generate unique code
    let code;
    let codeExists = true;
    while (codeExists) {
      code = generateCode();
      const existingCode = await Team.findOne({ where: { code } });
      if (!existingCode) codeExists = false;
    }

    const team = await Team.create({
      name: teamName.trim(),
      captainName: captainName.trim(),
      phone: phone.trim(),
      code,
      secretCode: secretCode.trim(),
      paid: false
    });

    const captain = await Player.create({
      teamId: team.id,
      name: captainName.trim(),
      phone: phone.trim(),
      status: 'confirmed',
      isCaptain: true
    });

    res.status(201).json({ ...team.toJSON(), players: [captain.toJSON()] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la création" });
  }
});

// POST /api/teams/:code/join — rejoindre une équipe
router.post('/:code/join', async (req, res) => {
  try {
    const { playerName, phone } = req.body;
    if (!playerName) return res.status(400).json({ error: 'Le nom du joueur est requis' });
    
    const team = await Team.findOne({ 
      where: { code: req.params.code.toUpperCase() },
      include: Player
    });

    if (!team) return res.status(404).json({ error: 'Équipe introuvable' });
    if (team.Players.length >= 12) {
      return res.status(400).json({ error: 'Cette équipe est complète (12 joueurs maximum)' });
    }

    const player = await Player.create({
      teamId: team.id,
      name: playerName.trim(),
      phone: (phone || '').trim(),
      status: 'confirmed',
      isCaptain: false
    });

    res.status(201).json({ player: player.toJSON(), team: team.toJSON() });
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de l'ajout du joueur" });
  }
});

// PUT /api/teams/players/:id/confirm
router.put('/players/:id/confirm', async (req, res) => {
  try {
    const player = await Player.findByPk(req.params.id);
    if (!player) return res.status(404).json({ error: 'Joueur introuvable' });
    
    player.status = 'confirmed';
    await player.save();
    
    res.json({ player: player.toJSON() });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// DELETE /api/teams/players/:id
router.delete('/players/:id', async (req, res) => {
  try {
    const player = await Player.findByPk(req.params.id);
    if (!player) return res.status(404).json({ error: 'Joueur introuvable' });
    if (player.isCaptain) return res.status(400).json({ error: 'Le capitaine ne peut pas être retiré' });
    
    await player.destroy();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// PUT /api/teams/:code/pay — marquer comme payé
router.put('/:code/pay', async (req, res) => {
  try {
    const team = await Team.findOne({ where: { code: req.params.code.toUpperCase() } });
    if (!team) return res.status(404).json({ error: 'Équipe introuvable' });
    
    team.paid = !team.paid; // Toggle status
    await team.save();
    
    res.json({ message: 'Statut de paiement mis à jour', paid: team.paid });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// DELETE /api/teams/:id — supprimer une équipe
router.delete('/:id', async (req, res) => {
  try {
    const team = await Team.findByPk(req.params.id);
    if (!team) return res.status(404).json({ error: 'Équipe introuvable' });
    
    // Sequelize CASCADE will delete players automatically
    await team.destroy();
    
    res.json({ success: true, message: 'Équipe supprimée' });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
