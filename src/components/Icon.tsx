import { Coffee, Leaf, Martini, Landmark, ShoppingBag, Building2, Plane, TrainFront, Utensils, BedDouble, Palette, Trees, Footprints, CarFront, MapPin } from 'lucide-react';
export function CategoryIcon({ category, size = 18 }: { category: string; size?: number }) {
  const Icon = ({ '咖啡廳':Coffee, '素食餐廳':Leaf, '酒吧':Martini, '古蹟':Landmark,
    '古蹟／歷史':Landmark, '商圈':ShoppingBag, '老件店':Building2, '機場':Plane,
    '航班':Plane, '交通':TrainFront, '用餐':Utensils, '早餐':Coffee, '住宿':BedDouble,
    '美術館':Palette, '公園':Trees, '美術館／公園':Palette, '步行':Footprints,
    '接駁':CarFront, '預約專車':CarFront } as Record<string, typeof Coffee>)[category] ?? MapPin;
  return <Icon size={size} strokeWidth={1.7} aria-hidden="true" />;
}
