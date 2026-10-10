import { DistractionClass } from '../types';

export const DISTRACTION_CLASSES: DistractionClass[] = [
  {
    id: 'c0',
    name: 'Safe Driving',
    category: 'safe',
    description: 'Driver is attentive, looking forward with hands positioned on steering wheel.',
    subLabel: 'Normal Operation',
    iconName: 'ShieldCheck',
    color: '#10B981'
  },
  {
    id: 'c1',
    name: 'Texting (Right Hand)',
    category: 'distraction',
    description: 'Driver holds smartphone in right hand while typing or reading text messages.',
    subLabel: 'Manual & Visual Distraction',
    iconName: 'Smartphone',
    color: '#EF4444'
  },
  {
    id: 'c2',
    name: 'Talking Phone (Right Ear)',
    category: 'distraction',
    description: 'Driver holds smartphone to right ear for active cellular phone conversation.',
    subLabel: 'Manual & Auditory Distraction',
    iconName: 'PhoneCall',
    color: '#F59E0B'
  },
  {
    id: 'c3',
    name: 'Texting (Left Hand)',
    category: 'distraction',
    description: 'Driver holds smartphone in left hand while typing or scrolling.',
    subLabel: 'Manual & Visual Distraction',
    iconName: 'Smartphone',
    color: '#EF4444'
  },
  {
    id: 'c4',
    name: 'Talking Phone (Left Ear)',
    category: 'distraction',
    description: 'Driver holds smartphone to left ear for phone conversation.',
    subLabel: 'Manual & Auditory Distraction',
    iconName: 'PhoneCall',
    color: '#F59E0B'
  },
  {
    id: 'c5',
    name: 'Operating Radio / Controls',
    category: 'distraction',
    description: 'Driver reaching forward to tune dashboard radio or air conditioning controls.',
    subLabel: 'Cabin Device Interaction',
    iconName: 'Radio',
    color: '#EC4899'
  },
  {
    id: 'c6',
    name: 'Drinking / Eating',
    category: 'distraction',
    description: 'Driver drinking from cup, bottle, or consuming food while driving.',
    subLabel: 'Hand-Off-Wheel Distraction',
    iconName: 'CupSoda',
    color: '#8B5CF6'
  },
  {
    id: 'c7',
    name: 'Reaching Behind',
    category: 'distraction',
    description: 'Driver turning torso to reach for objects on the rear passenger seats.',
    subLabel: 'Severe Postural Distraction',
    iconName: 'MoveLeft',
    color: '#F97316'
  },
  {
    id: 'c8',
    name: 'Hair & Makeup Grooming',
    category: 'distraction',
    description: 'Driver adjusting hair, makeup, or inspecting vanity mirror.',
    subLabel: 'Visual & Cognitive Distraction',
    iconName: 'Sparkles',
    color: '#6366F1'
  },
  {
    id: 'c9',
    name: 'Talking to Passenger',
    category: 'distraction',
    description: 'Driver turning head and diverting gaze to converse with cabin passenger.',
    subLabel: 'Social Gaze Diversion',
    iconName: 'Users',
    color: '#14B8A6'
  }
];
