import Phaser from 'phaser';

export class OfficeScene extends Phaser.Scene {
  constructor() { super('OfficeScene'); }

  preload() {
    this.load.image('tiles_office', '/assets/tilesets/pixel_office.png');
    this.load.tilemapTiledJSON('mapa_office', '/assets/maps/oficina.json');
    // load.spritesheet (no load.image) indicant la mida de cada frame (48x48)
    this.load.spritesheet('george', '/assets/sprites/george.png', { frameWidth: 48, frameHeight: 48 });
  }

  create() {
    const map = this.make.tilemap({ key: 'mapa_office' });
    const tileset = map.addTilesetImage('pixel_office_tiles', 'tiles_office');
    map.createLayer('Terra', tileset, 0, 0);
    this.capaParets = map.createLayer('Parets', tileset, 0, 0);
    this.capaParets?.setCollisionByProperty({ collides: true });

    this.zones = [];
    this.monitors = [];
    this.monitorProper = null;
    this.direccio = 'avall';
    this.frameQuiets = { avall: 0, esquerra: 1, amunt: 2, dreta: 3 };

    // Llegim la capa 'Objectes' per trobar el spawn, les zones i els monitors
    map.getObjectLayer('Objectes')?.objects.forEach((obj) => {
      const props = this.obtenirPropietats(obj);
      const cx = obj.x + (obj.width || 0) / 2, cy = obj.y + (obj.height || 0) / 2;

      if (props.tipus === 'spawn') {
        this.jugador = this.physics.add.sprite(cx, cy, 'george', 0); // Frame 0 = quiet mirant avall
        // Hitbox petit als peus (16x12 px) desplaçat (16, 32) dins del frame 48x48
        this.jugador.body.setSize(16, 12);
        this.jugador.body.setOffset(16, 32);
        this.jugador.setCollideWorldBounds(true);
        this.jugador.setDepth(10);
        // Debug visual (requadre rosa als peus). Descomenta per veure'l.
        // this.physics.world.createDebugGraphic();
        // Bloqueja el pas contra les rajoles de 'Parets' amb collides: true
        if (this.capaParets) this.physics.add.collider(this.jugador, this.capaParets);
        this.etiqueta = this.add.text(cx, cy - 30, 'Fode', { fontSize: '11px', color: '#ffffff' }).setOrigin(0.5).setDepth(11);
      }

      if (props.tipus === 'zona') {
        const rect = new Phaser.Geom.Rectangle(obj.x, obj.y, obj.width, obj.height);
        this.zones.push({ nom: props.nomSala || 'Sala', rect });
        this.add.rectangle(cx, cy, obj.width, obj.height, 0x10b981, 0.18).setStrokeStyle(1.5, 0x10b981);
        this.add.text(cx, obj.y + 12, props.nomSala || 'Sala', { fontSize: '11px', color: '#a7f3d0' }).setOrigin(0.5);
      }

      // Repte 2: guardem els monitors per detectar la proximitat
      if (props.tipus === 'monitor') {
        this.monitors.push({ titol: props.titol || 'Monitor', x: cx, y: cy });
      }
    });
    this.zonaActual = null;

    this.crearAnimacions();
    this.cursors = this.input.keyboard.createCursorKeys();
    this.teclesWASD = this.input.keyboard.addKeys('W,A,S,D');
    this.teclaShift = this.input.keyboard.addKey('SHIFT'); // Repte 1
  }

  // Les direccions van per COLUMNES a george.png: passem l'array exacte de cada columna
  crearAnimacions() {
    const seq = {
      avall: [0, 4, 8, 12],
      esquerra: [1, 5, 9, 13],
      amunt: [2, 6, 10, 14],
      dreta: [3, 7, 11, 15]
    };
    Object.entries(seq).forEach(([dir, frames]) => {
      this.anims.create({
        key: `caminar-${dir}`,
        frames: this.anims.generateFrameNumbers('george', { frames }),
        frameRate: 8,
        repeat: -1
      });
    });
  }

  update() {
    if (!this.jugador) return;
    let vx = 0, vy = 0;
    if (this.cursors.left.isDown || this.teclesWASD.A.isDown)  vx = -1;
    if (this.cursors.right.isDown || this.teclesWASD.D.isDown) vx =  1;
    if (this.cursors.up.isDown || this.teclesWASD.W.isDown)    vy = -1;
    if (this.cursors.down.isDown || this.teclesWASD.S.isDown)  vy =  1;

    // Repte 1: Sprint amb Shift
    const sprint = this.teclaShift.isDown;
    const velocitat = sprint ? 260 : 160;
    this.jugador.anims.timeScale = sprint ? 1.6 : 1.0;

    // Normalitzem perquè caminar en diagonal no sigui un 41% més ràpid
    const vel = new Phaser.Math.Vector2(vx, vy).normalize().scale(velocitat);
    this.jugador.setVelocity(vel.x, vel.y);

    // Triem l'animació segons cap on camina; si s'atura, deixem l'última mirada
    if (vx !== 0 || vy !== 0) {
      if (Math.abs(vx) > Math.abs(vy)) this.direccio = vx < 0 ? 'esquerra' : 'dreta';
      else this.direccio = vy < 0 ? 'amunt' : 'avall';
      this.jugador.anims.play(`caminar-${this.direccio}`, true);
    } else {
      this.jugador.anims.stop();
      this.jugador.setFrame(this.frameQuiets[this.direccio]);
    }
    this.etiqueta.setPosition(this.jugador.x, this.jugador.y - 30);

    this.comprovarZones();
    this.comprovarMonitors();
  }

  // Emet 'canvi-zona' NOMÉS quan entrem o sortim d'una sala
  comprovarZones() {
    const peuY = this.jugador.y + 14; // Punt exacte dels peus
    const trobada = this.zones.find((z) => Phaser.Geom.Rectangle.Contains(z.rect, this.jugador.x, peuY)) || null;
    if (trobada?.nom !== this.zonaActual?.nom) {
      this.zonaActual = trobada;
      this.game.events.emit('canvi-zona', trobada ? { nom: trobada.nom } : null);
    }
  }

  // Repte 2: avisa a Vue quan George és a menys de 40 px d'un monitor
  comprovarMonitors() {
    const a_prop = this.monitors.find((m) =>
      Phaser.Math.Distance.Between(this.jugador.x, this.jugador.y, m.x, m.y) < 40
    ) || null;
    if (a_prop?.titol !== this.monitorProper?.titol) {
      this.monitorProper = a_prop;
      this.game.events.emit('a-prop-monitor', a_prop ? { titol: a_prop.titol } : null);
    }
  }

  // Annex: ordre que arriba des de Vue (botó «Posar George verd»)
  canviarColor(color) {
    this.jugador?.setTint(color);
  }

  obtenirPropietats(obj) {
    const res = {}; (obj.properties || []).forEach((p) => { res[p.name] = p.value; }); return res;
  }
}