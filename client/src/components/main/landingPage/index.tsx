import { useEffect, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import pancakeImage from '/logo/pancake_overflow.PNG';
import './index.css';
import { useNavigate } from 'react-router-dom';

interface PancakeData {
  width: number;
  color: string;
}

interface MousePos {
  x: number;
  y: number;
}

const LandingPage = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const targetMousePos = useRef<MousePos>({ x: 0, y: 0 });
  const currentMousePos = useRef<MousePos>({ x: 0, y: 0 });
  const animationRef = useRef<number | null>(null);
  const navigate = useNavigate();

  const handleLoginRedirect = () => {
    navigate('/login');
  };

  const handleSignUpRedirect = () => {
    navigate('/signup');
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      targetMousePos.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1,
      };
    };

    window.addEventListener('mousemove', handleMouseMove);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    // Set canvas size
    canvas.width = 600 * dpr;
    canvas.height = 600 * dpr;
    canvas.style.width = '600px';
    canvas.style.height = '600px';
    ctx.scale(dpr, dpr);

    const pancakeThickness = 12;
    const stackBaseY = 350;

    const pancakes: PancakeData[] = [
      { width: 225 * 1.5, color: '#FFFFFF' }, // Bottom Plate
      { width: 190 * 1.5, color: '#CD853F' }, // Bottom Pancake
      { width: 185 * 1.5, color: '#CD853F' },
      { width: 180 * 1.5, color: '#CD853F' },
      { width: 175 * 1.5, color: '#CD853F' },
      { width: 170 * 1.5, color: '#CD853F' },
    ];

    let time = 0;

    const adjustColor = (color: string, amount: number): string => {
      return (
        '#' +
        color.replace(/^#/, '').replace(/../g, col => {
          const hex = '0' + Math.min(255, Math.max(0, parseInt(col, 16) + amount)).toString(16);
          return hex.substr(-2);
        })
      );
    };

    const drawPancake = (
      centerX: number,
      centerY: number,
      width: number,
      thickness: number,
      color: string,
      rotation: number,
    ) => {
      const height = width * 0.4;
      const r = width / 2;

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rotation);

      // -- The Side (Crust) --
      ctx.beginPath();
      ctx.ellipse(0, 0, r, height / 2, 0, 0, Math.PI);
      ctx.lineTo(r, -thickness);
      ctx.ellipse(0, -thickness, r, height / 2, 0, Math.PI, 0, true);
      ctx.lineTo(-r, 0);
      ctx.closePath();

      ctx.fillStyle = adjustColor(color, -40);
      ctx.fill();

      // Side texture
      ctx.fillStyle = 'rgba(100, 50, 20, 0.1)';
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        const randX = (Math.random() - 0.5) * r * 1.5;
        const randY = (Math.random() - 0.5) * thickness - thickness / 2;
        ctx.arc(randX, randY, 1, 0, Math.PI * 2);
        ctx.fill();
      }

      // -- The Top Face --
      ctx.beginPath();
      ctx.ellipse(0, -thickness, r, height / 2, 0, 0, Math.PI * 2);

      const grad = ctx.createRadialGradient(0, -thickness - 10, 0, 0, -thickness, r);
      grad.addColorStop(0, adjustColor(color, 40));
      grad.addColorStop(1, color);
      ctx.fillStyle = grad;
      ctx.fill();

      // Top rim highlight
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();
    };

    const drawButter = (x: number, y: number) => {
      ctx.save();
      ctx.translate(x, y - 10);

      ctx.fillStyle = '#FCEFA1';
      ctx.fillRect(-15, -10, 30, 20);

      ctx.beginPath();
      ctx.moveTo(-15, -10);
      ctx.lineTo(-5, -20);
      ctx.lineTo(25, -20);
      ctx.lineTo(15, -10);
      ctx.fillStyle = '#FFF8DC';
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(15, -10);
      ctx.lineTo(25, -20);
      ctx.lineTo(25, 0);
      ctx.lineTo(15, 10);
      ctx.fillStyle = '#E6D690';
      ctx.fill();

      ctx.restore();
    };

    const animate = () => {
      if (!canvasRef.current) return;

      ctx.clearRect(0, 0, 600, 600);
      time += 0.02;

      currentMousePos.current.x += (targetMousePos.current.x - currentMousePos.current.x) * 0.05;
      currentMousePos.current.y += (targetMousePos.current.y - currentMousePos.current.y) * 0.05;

      const mx = currentMousePos.current.x;
      const my = currentMousePos.current.y;

      // Shadow
      ctx.beginPath();
      ctx.ellipse(300 + mx * 20, stackBaseY + 20, 100, 30, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.fill();

      let currentY = stackBaseY;

      pancakes.forEach((pancake, index) => {
        const offsetX = mx * index * 8 + Math.sin(time + index) * 2;
        const offsetY = my * index * 4;
        const rotation = mx * 0.05 + Math.sin(time * 2 + index) * 0.01;

        drawPancake(
          300 + offsetX,
          currentY + offsetY,
          pancake.width,
          pancakeThickness,
          pancake.color,
          rotation,
        );

        currentY -= pancakeThickness + 5;
      });

      const topPancakeOffset = mx * pancakes.length * 8;
      drawButter(300 + topPancakeOffset, currentY + my * pancakes.length * 4);

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className='landing-page'>
      {/* Navigation */}
      <nav className='nav-glass'>
        <div className='nav-container'>
          <div className='nav-brand'>
            <img src={pancakeImage} width={64} />
            <span className='brand-text'>PancakeOverflow</span>
          </div>
          <div className='nav-actions'>
            <button className='btn-outline' onClick={handleLoginRedirect}>
              Login
            </button>
            <button className='btn-primary' onClick={handleSignUpRedirect}>
              Sign Up
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className='section-spacing'>
        <div className='container-wide'>
          <div className='hero-grid'>
            {/* Left Content */}
            <div className='hero-content-left'>
              <h1 className='hero-title animate-enter'>
                Find your <br />
                <span className='text-gradient'>Community</span>
              </h1>

              <p className='hero-subtitle animate-enter delay-100'>
                Perfect recipes together, share techniques,
                <br />
                and grow your culinary knowledge.
              </p>

              <div className='animate-enter delay-200'>
                <button className='btn-primary' onClick={handleLoginRedirect}>
                  Get Started
                  <ArrowRight size={20} />
                </button>
              </div>
            </div>

            {/* Right 3D Canvas */}
            <div className='hero-visual-right animate-enter delay-300'>
              <canvas ref={canvasRef} className='pancake-canvas' />
            </div>
          </div>
        </div>
      </div>
      <div className='section-spacing'>
        <div className='container-wide'>
          <h1>User Story 1: Personalization & Identity</h1>
          <p>
            [cite_start]Users can now fully personalize their experience on FakeStackOverflow[cite:
            47]. [cite_start]This includes connecting third-party accounts (Google, Github)[cite:
            48], [cite_start]customizing profiles with crop-able profile pictures and banners[cite:
            49, 54], [cite_start]and showcasing achievements through a selectable badge system[cite:
            58]. [cite_start]Privacy is prioritized with options to toggle public/private profiles
            [cite: 70, 77] [cite_start]and the ability to block unwanted interactions[cite: 80].
          </p>
          <h1>User Story 2: Notifications & Moderation</h1>
          <p>
            A comprehensive notification center allows users to track alerts, filter by type,
            [cite_start]and stay updated on platform activity[cite: 91]. For communities, a robust
            [cite_start]moderation system introduces role-based permissions[cite: 169], enabling
            [cite_start]admins to mute or ban users and review appeal requests[cite: 205, 206].
            [cite_start]Separation of powers ensures no single moderator has unchecked
            authority[cite: 163, 172].
          </p>
          <h1>User Story 3: Gamification & Monetization</h1>
          <p>
            To enhance engagement and sustainability, the platform introduces gamification
            [cite_start]features like daily login streaks, rewards, and "Top Contributor" tags[cite:
            94, 95, 139]. A monetization model offers Premium memberships that remove ads, boost
            question visibility, [cite_start]and provide streak repair passes[cite: 200, 294].
            Safety is maintained via an [cite_start]automated ban system that triggers after a
            threshold of unique user reports[cite: 177, 180].
          </p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
