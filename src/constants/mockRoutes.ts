import { Route } from '../types/route';

export const MOCK_ROUTES: Route[] = [
  {
    id: 'pine-forest-walk',
    title: 'Pine Forest Walk',
    description: 'A shaded loop through tall pines with gentle elevation changes.',
    distance: '4.2 km',
    duration: '1h 15m',
    difficulty: 'easy',
    region: 'Alanya Hills',
    image:
      'https://images.unsplash.com/photo-1476231682828-37e571bc172f?w=800&q=80&auto=format&fit=crop',
  },
  {
    id: 'sunset-hill-route',
    title: 'Sunset Hill Route',
    description: 'Climb to a west-facing ridge for golden hour views over the valley.',
    distance: '6.8 km',
    duration: '2h 10m',
    difficulty: 'moderate',
    region: 'Sunset Ridge',
    image:
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80&auto=format&fit=crop',
  },
  {
    id: 'riverside-easy-trail',
    title: 'Riverside Easy Trail',
    description: 'Flat riverside path perfect for a relaxed walk or light jog.',
    distance: '3.1 km',
    duration: '45m',
    difficulty: 'easy',
    region: 'Dim Valley',
    image:
      'https://images.unsplash.com/photo-1439068791047-4c2c8e3c5e3f?w=800&q=80&auto=format&fit=crop',
  },
];
