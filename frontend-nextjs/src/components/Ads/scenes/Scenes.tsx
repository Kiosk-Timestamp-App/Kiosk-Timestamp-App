import gsap from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import type { SceneId } from '../timeline';
import SpotDrone from './SpotDrone';
import SpotMaintenance from './SpotMaintenance';
import SpotCleaning from './SpotCleaning';
import SpotRepowering from './SpotRepowering';
import Outro from './Outro';

gsap.registerPlugin(MotionPathPlugin);
// Wanduhr statt Frame-Zählung: Ruckler bis 2 s werden in Echtzeit aufgeholt (keine Dehnung auf
// schwachen TVs); nur echte Blockaden > 2 s (Tab im Hintergrund, Dekodieren) gelten als 50 ms
gsap.ticker.lagSmoothing(2000, 50);
gsap.config({ nullTargetWarn: false, force3D: true });

/** Einstieg des (lazy geladenen) Spot-Pakets */
export default function Scene({ id, playing, website, onDone }: { id: SceneId; playing: boolean; website: string | null; onDone?: () => void }) {
  if (id === 'drohne') return <SpotDrone playing={playing} onDone={onDone} />;
  if (id === 'wartung') return <SpotMaintenance playing={playing} onDone={onDone} />;
  if (id === 'reinigung') return <SpotCleaning playing={playing} onDone={onDone} />;
  if (id === 'repowering') return <SpotRepowering playing={playing} onDone={onDone} />;
  return <Outro playing={playing} onDone={onDone} website={website} />;
}
