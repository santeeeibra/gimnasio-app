import { chequearContraste } from './src/lib/contraste.ts';
import { DEFAULT_TEMA } from './src/lib/tema.ts';

console.log('🧪 Test de validación de contraste\n');

// Test 1: Tema por defecto (debería pasar)
console.log('1️⃣ Tema por defecto:');
const resultado1 = chequearContraste(DEFAULT_TEMA);
console.log('   Hay fallos:', resultado1.hayFallos);
resultado1.pares.forEach(p => {
  console.log(`   ${p.ok ? '✅' : '❌'} ${p.label}: ${p.ratio.toFixed(1)}:1 (min ${p.umbral}:1)`);
});

// Test 2: Tema con bajo contraste (texto gris claro sobre blanco)
console.log('\n2️⃣ Tema con bajo contraste (texto gris sobre blanco):');
const temaBajo = {
  ...DEFAULT_TEMA,
  paper: '#ffffff',
  paper2: '#f5f5f5',
  ink: '#cccccc',        // texto gris muy claro
  inkSoft: '#dddddd',    // aún más claro
};
const resultado2 = chequearContraste(temaBajo);
console.log('   Hay fallos:', resultado2.hayFallos);
resultado2.pares.forEach(p => {
  if (!p.ok) {
    console.log(`   ❌ ${p.label}: ${p.ratio.toFixed(1)}:1 (min ${p.umbral}:1)`);
  }
});

// Test 3: Tema oscuro bien contrastado
console.log('\n3️⃣ Tema oscuro bien contrastado:');
const temaOscuro = {
  ...DEFAULT_TEMA,
  paper: '#0a0e1a',
  paper2: '#1a1f3d',
  ink: '#ffffff',
  inkSoft: '#a0a8c0',
  rule: '#3d4460',
  volt: '#00d4ff',
  voltInk: '#0a0e1a',
};
const resultado3 = chequearContraste(temaOscuro);
console.log('   Hay fallos:', resultado3.hayFallos);
resultado3.pares.forEach(p => {
  console.log(`   ${p.ok ? '✅' : '❌'} ${p.label}: ${p.ratio.toFixed(1)}:1`);
});

console.log('\n✅ Tests completados');
