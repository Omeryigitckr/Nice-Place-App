/** Post-launch only. Community routes are postponed until after first public release. */
import { Difficulty } from './place';

export interface Route {
  id: string;
  title: string;
  description: string;
  distance: string;
  duration: string;
  difficulty: Difficulty;
  region: string;
  image: string;
}
