import React, { useEffect, useRef, useState } from 'react';

/**
 * Liquid Number Universe - Piano Countdown Edition
 * Interactive particle physics with additive piano synthesis and visual click feedback.
 * The "CLICK" text only appears during the initial state (Number 10).
 */

const App = () => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [currentNumber, setCurrentNumber] = useState(10);
  const [clickEffect, setClickEffect] = useState({ x: 0, y: 0, visible: false });
  const particles = useRef([]);
  const mouse = useRef({ x: -1000, y: -1000, active: false });
  const animationFrameId = useRef(null);
  const audioCtx = useRef(null);

  // Configuration
  const PARTICLE_COUNT = 2000; 
  const RETURN_SPEED = 0.05;
  const FRICTION = 0.93;
  const MOUSE_STRENGTH = 0.7;

  // Piano Synthesis Engine
  const playPianoNote = (num) => {
    try {
      if (!audioCtx.current) {
        audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtx.current;
      
      const notes = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25, 587.33, 659.25, 698.46];
      const baseFreq = notes[10 - num] || 440;

      const masterGain = ctx.createGain();
      masterGain.connect(ctx.destination);

      const osc1 = ctx.createOscillator();
      const g1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      g1.gain.setValueAtTime(0.3, ctx.currentTime);
      g1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      osc1.connect(g1);
      g1.connect(masterGain);

      const osc2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(baseFreq * 2.01, ctx.currentTime);
      g2.gain.setValueAtTime(0.15, ctx.currentTime);
      g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc2.connect(g2);
      g2.connect(masterGain);

      const osc3 = ctx.createOscillator();
      const g3 = ctx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(baseFreq * 3, ctx.currentTime);
      g3.gain.setValueAtTime(0.08, ctx.currentTime);
      g3.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc3.connect(g3);
      g3.connect(masterGain);

      const noise = ctx.createOscillator();
      const noiseGain = ctx.createGain();
      noise.type = 'square';
      noise.frequency.setValueAtTime(baseFreq / 2, ctx.currentTime);
      noiseGain.gain.setValueAtTime(0.05, ctx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      noise.connect(noiseGain);
      noiseGain.connect(masterGain);

      [osc1, osc2, osc3, noise].forEach(o => {
        o.start();
        o.stop(ctx.currentTime + 1.5);
      });

    } catch (e) {
      console.warn("Audio Context Error:", e);
    }
  };

  class Particle {
    constructor(x, y, targetX, targetY, color) {
      this.x = Math.random() * window.innerWidth;
      this.y = Math.random() * window.innerHeight;
      this.targetX = targetX;
      this.targetY = targetY;
      this.vx = (Math.random() - 0.5) * 35;
      this.vy = (Math.random() - 0.5) * 35;
      this.radius = Math.random() * 2 + 1;
      this.color = color;
      this.originColor = color;
    }

    setTarget(tx, ty) {
      this.targetX = tx;
      this.targetY = ty;
    }

    update(mouseX, mouseY, isActive) {
      const dxTarget = this.targetX - this.x;
      const dyTarget = this.targetY - this.y;
      this.vx += dxTarget * RETURN_SPEED;
      this.vy += dyTarget * RETURN_SPEED;

      if (isActive) {
        const dxMouse = this.x - mouseX;
        const dyMouse = this.y - mouseY;
        const distance = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
        const maxDist = 180;

        if (distance < maxDist) {
          const force = (maxDist - distance) / maxDist;
          const angle = Math.atan2(dyMouse, dxMouse);
          this.vx += Math.cos(angle) * force * 30 * MOUSE_STRENGTH;
          this.vy += Math.sin(angle) * force * 30 * MOUSE_STRENGTH;
          this.color = '#ffffff'; 
        } else {
          this.color = this.originColor;
        }
      } else {
        this.color = this.originColor;
      }

      this.vx *= FRICTION;
      this.vy *= FRICTION;
      this.x += this.vx;
      this.y += this.vy;
    }

    draw(ctx) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
    }
  }

  const getPointsForNumber = (num, width, height) => {
    const tempCanvas = document.createElement('canvas');
    const tCtx = tempCanvas.getContext('2d');
    tempCanvas.width = width;
    tempCanvas.height = height;

    tCtx.fillStyle = 'white';
    tCtx.textAlign = 'center';
    tCtx.textBaseline = 'middle';
    const fontSize = Math.min(width, height) * 0.7;
    tCtx.font = `900 ${fontSize}px "Inter", sans-serif`;
    tCtx.fillText(num.toString(), width / 2, height / 2);

    const imageData = tCtx.getImageData(0, 0, width, height);
    const points = [];
    const step = width < 600 ? 4 : 5; 

    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const index = (y * width + x) * 4;
        if (imageData.data[index + 3] > 128) {
          points.push({ x, y });
        }
      }
    }
    return points;
  };

  const updateParticleTargets = () => {
    if (!canvasRef.current) return;
    const { width, height } = canvasRef.current;
    const points = getPointsForNumber(currentNumber, width, height);

    if (particles.current.length === 0) {
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const point = points[Math.floor(Math.random() * points.length)] || { x: width / 2, y: height / 2 };
        const hue = 190 + Math.random() * 30;
        const color = `hsla(${hue}, 100%, 70%, 0.7)`;
        particles.current.push(new Particle(0, 0, point.x, point.y, color));
      }
    } else {
      particles.current.forEach((p) => {
        const point = points[Math.floor(Math.random() * points.length)] || { x: width / 2, y: height / 2 };
        p.setTarget(point.x, point.y);
      });
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      updateParticleTargets();
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const animate = () => {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(5, 7, 18, 0.25)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.current.forEach(p => {
        p.update(mouse.current.x, mouse.current.y, mouse.current.active);
        p.draw(ctx);
      });

      animationFrameId.current = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId.current);
    };
  }, [currentNumber]);

  const handleInteraction = (e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    mouse.current.x = clientX;
    mouse.current.y = clientY;
    mouse.current.active = true;

    // Only show "CLICK" text when starting from 10
    if (currentNumber === 10) {
      setClickEffect({ x: clientX, y: clientY, visible: true });
      setTimeout(() => {
        setClickEffect(prev => ({ ...prev, visible: false }));
      }, 400);
    }
    
    const nextNum = currentNumber > 0 ? currentNumber - 1 : 10;
    setCurrentNumber(nextNum);
    playPianoNote(nextNum);

    setTimeout(() => {
      mouse.current.active = false;
    }, 120);
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-screen bg-[#050712] overflow-hidden select-none touch-none cursor-crosshair"
      onMouseDown={handleInteraction}
      onTouchStart={handleInteraction}
    >
      <canvas 
        ref={canvasRef} 
        className="block w-full h-full"
      />

      {/* Dynamic "Click" Text Effect (only when currentNumber is 10) */}
      {clickEffect.visible && (
        <div 
          className="absolute pointer-events-none text-white font-bold text-lg tracking-widest animate-click-float"
          style={{ 
            left: clickEffect.x, 
            top: clickEffect.y,
            transform: 'translate(-50%, -100%)'
          }}
        >
          CLICK
        </div>
      )}

      {/* UI Overlay */}
      <div className="absolute top-12 left-0 w-full flex flex-col items-center pointer-events-none px-6">
        <h1 className="text-xl md:text-3xl font-black text-white/90 tracking-[0.4em] uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
          Piano Universe
        </h1>
        <p className="text-cyan-300/40 text-[10px] tracking-[0.6em] uppercase mt-2">
          Tap anywhere to play
        </p>
      </div>

      {/* Status Bar */}
      <div className="absolute bottom-12 left-0 w-full flex flex-col items-center pointer-events-none">
        <div className="flex items-center gap-6">
          <div className="w-16 h-[1px] bg-gradient-to-r from-transparent to-white/20" />
          <p className="text-white/60 text-[14px] font-medium tracking-[0.4em]">
            {currentNumber === 0 ? "RESONANCE 0.0" : `KEY ${currentNumber}`}
          </p>
          <div className="w-16 h-[1px] bg-gradient-to-l from-transparent to-white/20" />
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@900&display=swap');
        body { margin: 0; padding: 0; background: #050712; }
        canvas { filter: brightness(1.1) contrast(1.1); }
        
        @keyframes click-float {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
          20% { opacity: 1; transform: translate(-50%, -100%) scale(1.1); }
          100% { opacity: 0; transform: translate(-50%, -150%) scale(1); }
        }
        .animate-click-float {
          animation: click-float 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default App;
