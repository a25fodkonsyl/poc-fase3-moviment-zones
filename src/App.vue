<script setup>
import { ref, watch, onBeforeUnmount } from 'vue';
import PhaserCanvas from './components/PhaserCanvas.vue';

const zonaActiva = ref(null);    // null = passadís | { nom: '...' } = dins d'una sala
const monitorProper = ref(null); // Repte 2
const segons = ref(0);           // Repte 3
const refCanvas = ref(null);     // Annex
const modalObert = ref(false);   // Fase 4: modal gran
let interval = null;

// Repte 3: comptador de segons dins la sala; es reinicia en sortir
watch(zonaActiva, (zona) => {
  clearInterval(interval);
  segons.value = 0;
  if (zona) interval = setInterval(() => { segons.value++; }, 1000);
});
onBeforeUnmount(() => clearInterval(interval));

function obrirModalGran() {
  modalObert.value = true;
  refCanvas.value?.bloquejarControls(true);   // Atura el teclat de Phaser
}
function tancarModalGran() {
  modalObert.value = false;
  refCanvas.value?.bloquejarControls(false);  // Reactiva el teclat
}

// Annex: Vue dona una ordre a Phaser
function posarVerd() {
  refCanvas.value?.canviarColorGeorge(0x10b981);
}
</script>

<template>
  <main style="display: flex; gap: 20px; padding: 20px; font-family: sans-serif;">
    <PhaserCanvas
      ref="refCanvas"
      @canvi-zona="zonaActiva = $event"
      @a-prop-monitor="monitorProper = $event"
    />

    <aside style="width: 280px; background: #1e293b; color: white; padding: 18px; border-radius: 12px; text-align: left;">
      <h3>Estat de Proximitat</h3>
      <div v-if="zonaActiva" style="background: #065f46; border: 2px solid #10b981; padding: 14px; border-radius: 8px;">
        <strong>Dins de: {{ zonaActiva.nom }}</strong>
        <p style="margin: 6px 0 0; font-size: 13px; color: #a7f3d0;">Àudio de sala actiu (llest per Fase 4)</p>
        <p style="margin: 6px 0 0; font-size: 13px; color: #a7f3d0;">Temps a la sala: {{ segons }} s</p>
      </div>
      <div v-else style="background: #334155; padding: 14px; border-radius: 8px;">
        <strong>Passadís / Zona comuna</strong>
        <p style="margin: 6px 0 0; font-size: 13px; color: #cbd5e1;">Sense conversa activa</p>
      </div>

      <p v-if="monitorProper" style="margin-top: 12px; background: #92400e; padding: 10px; border-radius: 8px; font-size: 13px;">
        A prop de: {{ monitorProper.titol }}
      </p>

      <button @click="posarVerd" style="margin-top: 16px; width: 100%; padding: 8px; cursor: pointer;">
        Posar George verd
      </button>

      <p style="margin-top: 16px; font-size: 12px; color: #94a3b8;">Controls: WASD o Fletxes per moure en George. Shift per córrer.</p>
    </aside>
  </main>
</template>