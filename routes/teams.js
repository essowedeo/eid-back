import { Router } from 'express';
import { readDB, writeDB } from '../db.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

function generateCode() {
  return uuidv4().replace(/-/g, '').toUpperCase().slice(0, 6);
}

// GET /api/teams — liste publique
router.get('/', (req, res) => {
  const db = readDB();
  const teams = db.teams.map(team => {
    const players = db.players.filter(p => p.teamId === team.id);
    return {
      id: team.id,
      name: team.name,
      captainName: team.captainName,
      code: team.code,
      // secretCode intentionnellement exclu de la liste publique
      createdAt: team.createdAt,
      paid: team.paid || false,
      playerCount: players.length,
      confirmedCount: players.filter(p => p.status === 'confirmed').length,
    };
  });
  res.json(teams);
});

// GET /api/teams/:code — détail équipe
router.get('/:code', (req, res) => {
  const db = readDB();
  const team = db.teams.find(t => t.code === req.params.code.toUpperCase());
  if (!team) return res.status(404).json({ error: 'Équipe introuvable' });
  const players = db.players.filter(p => p.teamId === team.id);
  
  // SÉCURITÉ : Ne pas renvoyer le code secret dans la réponse publique
  const { secretCode, ...teamPublic } = team;
  res.json({ ...teamPublic, players });
});

// POST /api/teams/:code/auth — vérifier le code secret
router.post('/:code/auth', (req, res) => {
  const { secretCode } = req.body;
  const db = readDB();
  const team = db.teams.find(t => t.code === req.params.code.toUpperCase());
  
  if (!team) return res.status(404).json({ error: 'Équipe introuvable' });
  
  if (team.secretCode === secretCode.trim()) {
    res.json({ success: true, message: 'Accès autorisé' });
  } else {
    res.status(401).json({ error: 'Code secret incorrect' });
  }
});

// POST /api/teams — créer une équipe
router.post('/', (req, res) => {
  const { teamName, captainName, phone, secretCode } = req.body;
  if (!teamName || !captainName || !phone || !secretCode) {
    return res.status(400).json({ error: 'Tous les champs sont requis' });
  }
  const db = readDB();
  if (db.teams.find(t => t.name.toLowerCase() === teamName.trim().toLowerCase())) {
    return res.status(400).json({ error: "Ce nom d'équipe est déjà pris" });
  }
  let code;
  do { code = generateCode(); } while (db.teams.find(t => t.code === code));

  const team = {
    id: db.nextTeamId++,
    name: teamName.trim(),
    captainName: captainName.trim(),
    phone: phone.trim(),
    code,
    secretCode: secretCode.trim(),
    paid: false,
    createdAt: new Date().toISOString(),
  };
  const captain = {
    id: db.nextPlayerId++,
    teamId: team.id,
    name: captainName.trim(),
    phone: phone.trim(),
    status: 'confirmed',
    isCaptain: true,
    joinedAt: new Date().toISOString(),
  };
  db.teams.push(team);
  db.players.push(captain);
  writeDB(db);
  res.status(201).json({ ...team, players: [captain] });
});

// POST /api/teams/:code/join — rejoindre une équipe
router.post('/:code/join', (req, res) => {
  const { playerName, phone } = req.body;
  if (!playerName) return res.status(400).json({ error: 'Le nom du joueur est requis' });
  const db = readDB();
  const team = db.teams.find(t => t.code === req.params.code.toUpperCase());
  if (!team) return res.status(404).json({ error: 'Équipe introuvable' });
  const players = db.players.filter(p => p.teamId === team.id);
  if (players.length >= 12) {
    return res.status(400).json({ error: 'Cette équipe est complète (12 joueurs maximum)' });
  }
  const player = {
    id: db.nextPlayerId++,
    teamId: team.id,
    name: playerName.trim(),
    phone: (phone || '').trim(),
    status: 'confirmed',
    isCaptain: false,
    joinedAt: new Date().toISOString(),
  };
  db.players.push(player);
  writeDB(db);
  res.status(201).json({ player, team });
});

// PUT /api/teams/players/:id/confirm
router.put('/players/:id/confirm', (req, res) => {
  const db = readDB();
  const player = db.players.find(p => p.id === parseInt(req.params.id));
  if (!player) return res.status(404).json({ error: 'Joueur introuvable' });
  player.status = 'confirmed';
  writeDB(db);
  res.json({ player });
});

// DELETE /api/teams/players/:id
router.delete('/players/:id', (req, res) => {
  const db = readDB();
  const idx = db.players.findIndex(p => p.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Joueur introuvable' });
  if (db.players[idx].isCaptain) return res.status(400).json({ error: 'Le capitaine ne peut pas être retiré' });
  db.players.splice(idx, 1);
  writeDB(db);
  res.json({ success: true });
});

// PUT /api/teams/:code/pay — marquer comme payé
router.put('/:code/pay', (req, res) => {
  const db = readDB();
  const team = db.teams.find(t => t.code === req.params.code.toUpperCase());
  if (!team) return res.status(404).json({ error: 'Équipe introuvable' });
  
  team.paid = !team.paid; // Toggle status
  writeDB(db);
  res.json({ message: 'Statut de paiement mis à jour', paid: team.paid });
});

// DELETE /api/teams/:id — supprimer une équipe
router.delete('/:id', (req, res) => {
  const db = readDB();
  const id = parseInt(req.params.id);
  
  const teamIdx = db.teams.findIndex(t => t.id === id);
  if (teamIdx === -1) return res.status(404).json({ error: 'Équipe introuvable' });
  
  // Supprimer les joueurs associés
  db.players = db.players.filter(p => p.teamId !== id);
  
  // Supprimer l'équipe
  db.teams.splice(teamIdx, 1);
  
  writeDB(db);
  res.json({ success: true, message: 'Équipe supprimée' });
});

export default router;
