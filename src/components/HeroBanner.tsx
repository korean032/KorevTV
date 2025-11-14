/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { ChevronLeft, ChevronRight, Info, Play, Brain } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import LiquidGlassContainer from '@/components/LiquidGlassContainer';

interface BannerItem {
  id: string | number;
  title: string;
  description?: string;
  poster: string;
  backdrop?: string;
  year?: string;
  rate?: string;
  douban_id?: number;
  type?: string;
  region?: string;
  tags?: string[];
  creators?: string[];
}

interface HeroBannerProps {
  items: BannerItem[];
  autoPlayInterval?: number; // 自动播放间隔（毫秒）
  showControls?: boolean;
  showIndicators?: boolean;
  onRecommend?: (title?: string) => void;
}

export default function HeroBanner({
  items,
  autoPlayInterval = 5000,
  showControls = true,
  showIndicators = true,
  onRecommend,
}: HeroBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [showMore, setShowMore] = useState(false);

  // 处理图片 URL，使用代理绕过防盗链
  const getProxiedImageUrl = (url: string) => {
    // 如果是豆瓣图片，使用代理
    if (url?.includes('douban') || url?.includes('doubanio')) {
      return `/api/image-proxy?url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  // 预加载图片
  useEffect(() => {
    items.forEach((item) => {
      const img = new Image();
      const imageUrl = item.backdrop || item.poster;
      img.src = getProxiedImageUrl(imageUrl);
    });
  }, [items]);

  // 自动轮播
  useEffect(() => {
    if (!autoPlayInterval || isHovered || items.length <= 1) return;

    const interval = setInterval(() => {
      handleNext();
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [currentIndex, isHovered, autoPlayInterval, items.length]);

  const handleNext = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev + 1) % items.length);
    setTimeout(() => setIsTransitioning(false), 500);
  };

  const handlePrev = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    setTimeout(() => setIsTransitioning(false), 500);
  };

  const handleIndicatorClick = (index: number) => {
    if (isTransitioning || index === currentIndex) return;
    setIsTransitioning(true);
    setCurrentIndex(index);
    setTimeout(() => setIsTransitioning(false), 500);
  };

  // 触摸手势处理
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }
  };

  if (!items || items.length === 0) {
    return null;
  }

  const currentItem = items[currentIndex];
  const imageUrl = currentItem.backdrop || currentItem.poster;

  return (
    <div
      className='relative w-full h-[420px] sm:h-[460px] md:h-[360px] overflow-hidden rounded-2xl group'
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* 渐变背景 */}
      <div className='absolute inset-0'>
        {items.map((item, index) => {
          // 根据索引生成不同的渐变色
          const gradients = [
            'from-blue-600 via-purple-600 to-pink-600',
            'from-red-600 via-orange-600 to-yellow-600',
            'from-green-600 via-teal-600 to-cyan-600',
            'from-indigo-600 via-purple-600 to-pink-600',
            'from-emerald-600 via-green-600 to-lime-600',
            'from-violet-600 via-fuchsia-600 to-pink-600',
            'from-cyan-600 via-blue-600 to-indigo-600',
            'from-amber-600 via-orange-600 to-red-600',
          ];
          const gradient = gradients[index % gradients.length];

          return (
            <div
              key={item.id}
              className={`absolute inset-0 bg-gradient-to-r ${gradient} transition-opacity duration-700 ease-in-out ${
                index === currentIndex ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {/* 噪点纹理 */}
              <div className='absolute inset-0 opacity-10' style={{
                backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' /%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' /%3E%3C/svg%3E")',
              }}></div>
            </div>
          );
        })}
      </div>

      {/* 主要内容区域 - 移动端竖版，桌面端横版 */}
      <div className='relative h-full flex flex-col md:flex-row items-center justify-center md:justify-start gap-4 md:gap-8 lg:gap-12 px-4 sm:px-6 md:px-8 lg:px-12 py-6 md:py-0'>
        {/* 海报图片 - 移动端居中大图，桌面端左侧 */}
        <div className='flex-shrink-0'>
          {items.map((item, index) => (
            <div
              key={item.id}
              className={`transition-opacity duration-700 ease-in-out ${
                index === currentIndex ? 'opacity-100' : 'opacity-0 absolute'
              }`}
            >
              <img
                src={getProxiedImageUrl(item.poster)}
                alt={item.title}
                className='w-40 sm:w-48 md:w-40 lg:w-48 h-auto rounded-xl shadow-2xl ring-4 ring-white/30'
              />
            </div>
          ))}
        </div>

        {/* 内容信息 - 移动端居中，桌面端左对齐 */}
        <div className='flex-1 min-w-0 flex flex-col items-center md:items-start justify-center gap-2 md:gap-2.5 max-h-full text-center md:text-left'>
          {/* 标题 */}
          <h1 className='text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white drop-shadow-lg leading-tight line-clamp-2 flex-shrink-0'>
            {currentItem.title}
          </h1>

          {/* 元数据 */}
          <div className='flex items-center justify-center md:justify-start gap-2 sm:gap-3 text-xs sm:text-sm flex-shrink-0 flex-wrap'>
            {currentItem.year && (
              <span className='text-white/90 font-medium'>{currentItem.year}</span>
            )}
            {currentItem.rate && (
              <div className='flex items-center gap-1 px-2 py-1 bg-white/20 backdrop-blur-sm rounded'>
                <span className='text-yellow-400'>★</span>
                <span className='text-white font-semibold'>{currentItem.rate}</span>
              </div>
            )}
            {currentItem.type && (
              <span className='px-2 py-1 bg-white/20 backdrop-blur-sm rounded text-white/90'>
                {currentItem.type === 'movie' ? '电影' :
                 currentItem.type === 'tv' ? '剧集' :
                 currentItem.type === 'variety' ? '综艺' :
                 currentItem.type === 'shortdrama' ? '短剧' :
                 currentItem.type === 'anime' ? '动漫' : '剧集'}
              </span>
            )}
          </div>

          {/* 描述 - 只在较大屏幕显示，且限制最多2行 */}
          {currentItem.description && (
            <p className='hidden md:block text-sm lg:text-base text-white/80 line-clamp-2 max-w-2xl flex-shrink min-h-0'>
              {currentItem.description}
            </p>
          )}

          {/* 操作按钮 */}
          <div className='flex flex-wrap justify-center md:justify-start gap-2 sm:gap-3 flex-shrink-0'>
            <Link
              href={`/play?title=${encodeURIComponent(currentItem.title)}${currentItem.year ? `&year=${currentItem.year}` : ''}${currentItem.douban_id ? `&douban_id=${currentItem.douban_id}` : ''}${(currentItem.type === 'tv' || currentItem.type === 'movie') ? `&stype=${currentItem.type}` : ''}&stitle=${encodeURIComponent(currentItem.title)}`}
              className='flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-white text-black font-semibold rounded-xl hover:bg-gray-200 transition-all transform hover:scale-105 active:scale-95 shadow-lg text-sm sm:text-base'
            >
              <Play className='w-4 h-4 sm:w-5 sm:h-5' fill='currentColor' />
              <span>播放</span>
            </Link>
            <button
              onClick={() => setShowMore(true)}
              className='flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-white/20 backdrop-blur-sm text-white font-semibold rounded-xl hover:bg-white/30 transition-all transform hover:scale-105 active:scale-95 shadow-lg text-sm sm:text-base'
            >
              <Info className='w-4 h-4 sm:w-5 sm:h-5' />
              <span>更多</span>
            </button>
            {onRecommend && (
              <button
                onClick={() => onRecommend(currentItem.title)}
                className='flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-xl hover:bg-white/20 transition-all transform hover:scale-105 active:scale-95 shadow-lg text-sm sm:text-base'
              >
                <Brain className='w-4 h-4 sm:w-5 sm:h-5' />
                <span>智能推荐</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 导航按钮 - 桌面端显示 */}
      {showControls && items.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className='hidden md:flex absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/30 backdrop-blur-sm text-white items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-black/50 transition-all transform hover:scale-110'
            aria-label='上一张'
          >
            <LiquidGlassContainer className='w-full h-full flex items-center justify-center' roundedClass='rounded-full' intensity='medium' shadow='xl' border='subtle'>
              <ChevronLeft className='w-5 h-5 sm:w-6 sm:h-6' />
            </LiquidGlassContainer>
          </button>
          <button
            onClick={handleNext}
            className='hidden md:flex absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/30 backdrop-blur-sm text-white items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-black/50 transition-all transform hover:scale-110'
            aria-label='下一张'
          >
            <LiquidGlassContainer className='w-full h-full flex items-center justify-center' roundedClass='rounded-full' intensity='medium' shadow='xl' border='subtle'>
              <ChevronRight className='w-5 h-5 sm:w-6 sm:h-6' />
            </LiquidGlassContainer>
          </button>
        </>
      )}

      {/* 指示器 - 移动端更大更易点击 */}
      {showIndicators && items.length > 1 && (
        <div className='absolute bottom-4 sm:bottom-6 md:bottom-4 left-1/2 -translate-x-1/2 flex gap-2 md:gap-2'>
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => handleIndicatorClick(index)}
              className={`h-1.5 md:h-1.5 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'w-10 md:w-10 bg-white shadow-lg'
                  : 'w-1.5 md:w-1.5 bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`跳转到第 ${index + 1} 张`}
            />
          ))}
        </div>
      )}

      {/* 计数器 */}
      <div className='absolute top-4 right-4 px-3 py-1.5 bg-black/40 backdrop-blur-sm rounded-full text-white text-xs sm:text-sm font-medium'>
        {currentIndex + 1} / {items.length}
      </div>

      {/* 更多详情弹层 */}
      {showMore && (
        <div className='fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4' onClick={() => setShowMore(false)}>
          <LiquidGlassContainer className='w-full max-w-2xl p-6 space-y-4' roundedClass='rounded-2xl' intensity='strong' shadow='xl' border='subtle'>
            <div className='flex items-center justify-between'>
              <h3 className='text-lg font-semibold text-white'>{currentItem.title}</h3>
              <button onClick={() => setShowMore(false)} className='text-xs px-3 py-1 rounded-full bg-gray-700 text-white hover:bg-gray-800'>关闭</button>
            </div>
            <div className='flex items-center gap-2 text-sm text-white/90'>
              {currentItem.year && <span>{currentItem.year}</span>}
              {currentItem.rate && <span className='px-2 py-0.5 bg-white/20 rounded'>评分 {currentItem.rate}</span>}
              {currentItem.type && (
                <span className='px-2 py-0.5 bg-white/20 rounded'>
                  {currentItem.type === 'movie' ? '电影' :
                   currentItem.type === 'tv' ? '剧集' :
                   currentItem.type === 'variety' ? '综艺' :
                   currentItem.type === 'shortdrama' ? '短剧' :
                   currentItem.type === 'anime' ? '番剧' : '剧集'}
                </span>
              )}
              {currentItem.region && (
                <span className='px-2 py-0.5 bg-white/20 rounded'>地区 {currentItem.region}</span>
              )}
            </div>
            {/* 主创 / 标签 */}
            {(currentItem.creators?.length || currentItem.tags?.length) ? (
              <div className='flex flex-wrap items-center gap-2 text-xs'>
                {currentItem.creators && currentItem.creators.slice(0, 6).map((c, i) => (
                  <span key={`cr-${i}`} className='px-2 py-1 bg-white/15 text-white/90 rounded-full'>主创：{c}</span>
                ))}
                {currentItem.tags && currentItem.tags.slice(0, 8).map((t, i) => (
                  <span key={`tag-${i}`} className='px-2 py-1 bg-white/10 text-white/80 rounded-full'>{t}</span>
                ))}
              </div>
            ) : null}
            <div className='text-sm text-white/80 whitespace-pre-line max-h-64 overflow-y-auto'>
              {currentItem.description || '暂无更详细的简介'}
            </div>
            <div className='flex items-center justify-end gap-2'>
              <Link
                href={
                  currentItem.type === 'shortdrama'
                    ? '/shortdrama'
                    : `/douban?type=${currentItem.type === 'variety' ? 'show' : (currentItem.type || 'movie')}`
                }
                className='text-xs px-3 py-1 rounded-full bg-indigo-600 text-white hover:bg-indigo-700'
                onClick={() => setShowMore(false)}
              >
                跳转列表
              </Link>
              {onRecommend && (
                <button
                  onClick={() => { onRecommend(currentItem.title); setShowMore(false); }}
                  className='text-xs px-3 py-1 rounded-full bg-purple-600 text-white hover:bg-purple-700'
                >
                  打开AI推荐
                </button>
              )}
              <Link
                href={`/search?q=${encodeURIComponent(currentItem.title)}`}
                className='text-xs px-3 py-1 rounded-full bg-pink-600 text-white hover:bg-pink-700'
                onClick={() => setShowMore(false)}
              >
                相关推荐
              </Link>
            </div>
          </LiquidGlassContainer>
        </div>
      )}
    </div>
  );
}
