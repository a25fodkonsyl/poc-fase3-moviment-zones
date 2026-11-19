<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import Phaser from 'phaser';
import { OfficeScene } from '../game/OfficeScene';

const emit = defineEmits(['canviZona', 'aPropMonitor']);
const contenidor = ref(null);
let game = null;

// El pont transforma els avisos de Phaser en events de Vue
const reenviarZona = (zona) => emit('canviZona', zona);
const reenviarMonitor = (monitor) => emit('aPropMonitor', monitor);

onMounted(() => {
  game = new Phaser.Game({
    type: Phaser.AUTO,
    width: 640, height: 480,      // 40x30 rajoles de 16x16 px
    backgroundColor: '#0f172a',
    pixelArt: true,
    physics: {
      default: 'arcade',
      arcade: { gravity: { y: 0 } } // 0 gravetat en vista zenital
    },
    parent: contenidor.value,
    scene: [OfficeScene]
  });
  game.events.on('canvi-zona', reenviarZona);
  game.events.on('a-prop-monitor', reenviarMonitor);
});

onBeforeUnmount(() => {
  game?.events.off('canvi-zona', reenviarZona);
  game?.events.off('a-prop-monitor', reenviarMonitor);
  game?.destroy(true);
});

// Annex: ordre Vue -> Phaser
function canviarColorGeorge(color) {
  const escena = game?.scene.getScene('OfficeScene');
  if (escena?.sys.isActive()) escena.canviarColor(color);
}
defineExpose({ canviarColorGeorge });
</script>
<template><div ref="contenidor"></div></template>