import { AppLanguage } from '../types/music';

export interface Translations {
  // Navigation
  navHome: string;
  navBrowse: string;
  navLibrary: string;
  navSearch: string;
  navSettings: string;

  // Startup Splash
  brandName: string;
  splashSubtitle: string;

  // Home ("For You")
  forYouEyebrow: string;
  forYouTitle: string;
  scanDeviceMusic: string;
  scanningDevice: string;
  importFiles: string;
  importFolder: string;
  emptyHeadline: string;
  emptySubtitle: string;
  quickMixHeading: string;
  tracksReady: string;
  recentlyAdded: string;
  yourTracks: string;
  rediscoverAlbums: string;
  fromLocalLibrary: string;

  // Browse (formerly Explore)
  browseEyebrow: string;
  browseTitle: string;
  tracks: string;
  albums: string;
  artists: string;
  all: string;
  browseEmptyTitle: string;
  browseEmptyDesc: string;
  play: string;
  playing: string;
  scrollToBrowse: string;

  // Library
  libraryEyebrow: string;
  libraryTitle: string;
  allCategories: string;
  noAlbumsYet: string;
  noAlbumsDesc: string;
  noFilesYet: string;
  noFilesDesc: string;
  dropZoneTitle: string;
  dropZoneDesc: string;
  browseFiles: string;
  categories: {
    albums: string;
    artists: string;
    genres: string;
    tracks: string;
    playlists: string;
    files: string;
    compilations: string;
    years: string;
    favorites: string;
  };
  itemSingular: string;
  itemPlural: string;

  // Search
  searchEyebrow: string;
  searchTitle: string;
  searchPlaceholder: string;
  onlyFavorites: string;
  collectionEmpty: string;
  collectionEmptyDesc: string;
  noMatches: string;
  noMatchesDesc: string;
  resetFilters: string;
  found: string;

  // Now Playing
  modeGlassCover: string;
  modeTurntable: string;
  modeAmbientWave: string;
  utilSleep: string;
  utilSpeed: string;
  utilQueue: string;
  utilLyrics: string;
  utilEq: string;
  utilOutput: string;
  sleepTitle: string;
  speedTitle: string;
  queueTitle: string;
  lyricsTitle: string;
  eqTitle: string;
  outputTitle: string;
  sleepOff: string;
  sleepRemaining: string;
  pasteLyrics: string;
  viewLyrics: string;
  importLrc: string;
  noLyricsYet: string;
  saveLyrics: string;
  cancel: string;
  lyricsHelp: string;
  tiltHint: string;

  // Settings (4 Essential Tools)
  settingsEyebrow: string;
  settingsTitle: string;
  languageSection: string;
  languageLabel: string;
  languageHint: string;
  filterSection: string;
  shortClipsLabel: string;
  shortClipsHint: string;
  filterOff: string;
  under30s: string;
  under60s: string;
  hiddenFoldersLabel: string;
  hiddenFoldersHint: string;
  addFolderPlaceholder: string;
  addFolderBtn: string;
  hiddenTracksNotice: string;
  tagEditorSection: string;
  tagEditorEmpty: string;
  selectTrackLabel: string;
  fieldTitle: string;
  fieldArtist: string;
  fieldAlbum: string;
  uploadCustomCover: string;
  saveTagChanges: string;
  savedTagNotice: string;
  storageAboutSection: string;
  coverCacheLabel: string;
  coverCacheHint: string;
  clearCacheBtn: string;
  cacheClearedNotice: string;
  aboutTagline: string;
  whatsNewBtn: string;
  whatsNewTitle: string;
  whatsNewItems: string[];
  closeBtn: string;
  nowPlayingDefaultLabel: string;
  nowPlayingDefaultHint: string;

  // Drop overlay
  dropTitle: string;
  dropSubtitle: string;
}

export const TRANSLATIONS: Record<AppLanguage, Translations> = {
  en: {
    navHome: 'For You',
    navBrowse: 'Browse',
    navLibrary: 'Library',
    navSearch: 'Search',
    navSettings: 'Settings',

    brandName: 'Sillon',
    splashSubtitle: 'Preparing your music shelf…',

    forYouEyebrow: 'Sillon Music',
    forYouTitle: 'For You',
    scanDeviceMusic: 'Scan Device Music',
    scanningDevice: 'Scanning…',
    importFiles: 'Import Audio Files',
    importFolder: 'Import Folder',
    emptyHeadline: 'Your music collection is ready to bloom',
    emptySubtitle:
      'Scan your device or import MP3, FLAC, WAV, M4A, or OGG files. Embedded high-res album artwork and tags are extracted automatically.',
    quickMixHeading: 'Quick Mixes',
    tracksReady: 'tracks ready',
    recentlyAdded: 'Recent Albums',
    yourTracks: 'Your Tracks',
    rediscoverAlbums: 'Rediscover albums',
    fromLocalLibrary: 'From your local library',

    browseEyebrow: 'Float through your collection',
    browseTitle: 'Browse',
    tracks: 'Tracks',
    albums: 'Albums',
    artists: 'Artists',
    all: 'All',
    browseEmptyTitle: 'Nothing to browse yet',
    browseEmptyDesc:
      'Scan your music folder or import local tracks to glide through floating album cards.',
    play: 'Play',
    playing: 'Playing',
    scrollToBrowse: 'Click or scroll to glide',

    libraryEyebrow: 'Organized archive',
    libraryTitle: 'Library',
    allCategories: 'All Categories',
    noAlbumsYet: 'No albums imported yet',
    noAlbumsDesc:
      'Scan your device music or pick local audio files to populate your albums.',
    noFilesYet: 'No audio files yet',
    noFilesDesc:
      'Drop audio files anywhere on screen, or scan your device music folder.',
    dropZoneTitle: 'Scan or drop your local audio library',
    dropZoneDesc:
      'Extracts embedded ID3/MP4/FLAC artwork, title, artist, and album tags automatically.',
    browseFiles: 'Select Files',
    categories: {
      albums: 'Albums',
      artists: 'Artists',
      genres: 'Genres',
      tracks: 'Tracks',
      playlists: 'Playlists',
      files: 'Files',
      compilations: 'Compilations',
      years: 'Years',
      favorites: 'Favorites',
    },
    itemSingular: 'item',
    itemPlural: 'items',

    searchEyebrow: 'Find songs, albums, or artists',
    searchTitle: 'Search',
    searchPlaceholder: 'Search titles, artists, genres, or years…',
    onlyFavorites: 'Only favorites',
    collectionEmpty: 'Your library is empty',
    collectionEmptyDesc:
      'Import local MP3, FLAC, WAV, M4A, or OGG tracks to search instantly.',
    noMatches: 'No matching tracks',
    noMatchesDesc:
      'Try another title, artist, or disable the favorites filter.',
    resetFilters: 'Reset Filters',
    found: 'found',

    modeGlassCover: 'Glass Cover',
    modeTurntable: 'Turntable',
    modeAmbientWave: 'Ambient Wave',
    utilSleep: 'Sleep',
    utilSpeed: 'Speed',
    utilQueue: 'Queue',
    utilLyrics: 'Lyrics',
    utilEq: 'EQ',
    utilOutput: 'Output',
    sleepTitle: 'Sleep Timer',
    speedTitle: 'Playback Speed',
    queueTitle: 'Up Next Queue',
    lyricsTitle: 'Fluid Lyrics',
    eqTitle: '5-Band Equalizer',
    outputTitle: 'Audio Output',
    sleepOff: 'Off',
    sleepRemaining: 'min remaining',
    pasteLyrics: 'Paste',
    viewLyrics: 'View',
    importLrc: '.lrc',
    noLyricsYet: 'No lyrics attached to this track yet.',
    saveLyrics: 'Save Lyrics',
    cancel: 'Cancel',
    lyricsHelp: 'Paste timestamped .lrc lines or plain multi-line lyrics:',
    tiltHint: 'Touch or drag cover for 3D tilt',

    settingsEyebrow: 'Essential preferences',
    settingsTitle: 'Settings',
    languageSection: 'App Language',
    languageLabel: 'Display Language',
    languageHint: 'Auto-detected from device · Instant RTL mirroring for Persian',
    filterSection: 'Voice Note & Folder Filter',
    shortClipsLabel: 'Exclude Short Audio Clips',
    shortClipsHint: 'Automatically hide short voice notes and ringtones',
    filterOff: 'Off',
    under30s: '< 30s',
    under60s: '< 60s',
    hiddenFoldersLabel: 'Hidden Folders',
    hiddenFoldersHint: 'Keep messaging voice notes out of your music shelf',
    addFolderPlaceholder: 'Add folder name (e.g. VoiceNotes)',
    addFolderBtn: 'Add',
    hiddenTracksNotice: 'filtered out from library',
    tagEditorSection: 'Track Tag & Cover Editor',
    tagEditorEmpty: 'Import at least one track to edit its tags or custom cover art.',
    selectTrackLabel: 'Select Track',
    fieldTitle: 'Track Title',
    fieldArtist: 'Artist',
    fieldAlbum: 'Album',
    uploadCustomCover: 'Upload Cover',
    saveTagChanges: 'Save Changes',
    savedTagNotice: 'Track tags updated',
    storageAboutSection: 'Storage Cache & About Sillon',
    coverCacheLabel: 'Cached Cover Artwork',
    coverCacheHint: 'Decoded cover images & metadata held in memory',
    clearCacheBtn: 'Clear Cache',
    cacheClearedNotice: 'Cover cache cleared',
    aboutTagline: 'Modern tactile music player with dynamic album atmosphere.',
    whatsNewBtn: "What's New",
    whatsNewTitle: "What's New in Sillon v1.0.0",
    whatsNewItems: [
      'Glass Cover 3D parallax centerpiece with bass-reactive ambient glow',
      'Instant frosted-glass bottom utility popups locked to a zero-scroll 100dvh Now Playing view',
      'Hybrid local scanner with automatic ID3, MP4/M4A, and FLAC embedded cover extraction',
      'Full English & Persian (RTL) localization with Voice Note & Folder filters',
    ],
    closeBtn: 'Done',
    nowPlayingDefaultLabel: 'Now Playing Centerpiece',
    nowPlayingDefaultHint: 'Synced live with the top mode switcher in Now Playing',

    dropTitle: 'Drop your audio files',
    dropSubtitle:
      'Release MP3, FLAC, WAV, M4A, or OGG files to extract embedded covers and play immediately.',
  },
  fa: {
    navHome: 'برای شما',
    navBrowse: 'مرور',
    navLibrary: 'کتابخانه',
    navSearch: 'جستجو',
    navSettings: 'تنظیمات',

    brandName: 'سیون',
    splashSubtitle: 'در حال آماده‌سازی کتابخانه موسیقی…',

    forYouEyebrow: 'موزیک پلیر سیون',
    forYouTitle: 'برای شما',
    scanDeviceMusic: 'اسکن موزیک‌های دستگاه',
    scanningDevice: 'در حال اسکن…',
    importFiles: 'افزودن فایل‌های صوتی',
    importFolder: 'انتخاب پوشه',
    emptyHeadline: 'کتابخانه موسیقی شما آماده جان گرفتن است',
    emptySubtitle:
      'موزیک‌های دستگاه را اسکن کنید یا فایل‌های صوتی خود را اضافه کنید. کاور و مشخصات هر آهنگ به‌صورت خودکار استخراج می‌شود.',
    quickMixHeading: 'میکس‌های سریع',
    tracksReady: 'آهنگ آماده',
    recentlyAdded: 'آلبوم‌های اخیر',
    yourTracks: 'آهنگ‌های شما',
    rediscoverAlbums: 'بازکشف آلبوم‌ها',
    fromLocalLibrary: 'از آرشیو محلی شما',

    browseEyebrow: 'گشت‌وگذار در مجموعه شما',
    browseTitle: 'مرور',
    tracks: 'آهنگ‌ها',
    albums: 'آلبوم‌ها',
    artists: 'هنرمندان',
    all: 'همه',
    browseEmptyTitle: 'هنوز آهنگی برای مرور نیست',
    browseEmptyDesc:
      'پوشه موسیقی دستگاه را اسکن کنید یا فایل‌های صوتی را اضافه کنید تا کارت‌های شناور آلبوم نمایش داده شوند.',
    play: 'پخش',
    playing: 'در حال پخش',
    scrollToBrowse: 'برای جابه‌جایی کلیک یا اسکرول کنید',

    libraryEyebrow: 'آرشیو دسته‌بندی‌شده',
    libraryTitle: 'کتابخانه',
    allCategories: 'همه دسته‌ها',
    noAlbumsYet: 'هنوز آلبومی اضافه نشده است',
    noAlbumsDesc:
      'برای ساخت آرشیو آلبوم‌ها، فایل‌های صوتی دستگاه خود را اسکن یا انتخاب کنید.',
    noFilesYet: 'فایل صوتی یافت نشد',
    noFilesDesc:
      'فایل‌های صوتی را روی صفحه رها کنید یا پوشه موسیقی دستگاه را اسکن کنید.',
    dropZoneTitle: 'اسکن یا افزودن آرشیو موسیقی دستگاه',
    dropZoneDesc:
      'استخراج خودکار کاورهای داخلی ID3/MP4/FLAC به همراه نام آهنگ، هنرمند و آلبوم.',
    browseFiles: 'انتخاب فایل',
    categories: {
      albums: 'آلبوم‌ها',
      artists: 'هنرمندان',
      genres: 'سبک‌ها',
      tracks: 'آهنگ‌ها',
      playlists: 'پلی‌لیست‌ها',
      files: 'فایل‌ها',
      compilations: 'مجموعه‌ها',
      years: 'سال‌ها',
      favorites: 'علاقه‌مندی‌ها',
    },
    itemSingular: 'مورد',
    itemPlural: 'مورد',

    searchEyebrow: 'جستجوی آهنگ، آلبوم یا هنرمند',
    searchTitle: 'جستجو',
    searchPlaceholder: 'جستجوی نام آهنگ، هنرمند، سبک یا سال…',
    onlyFavorites: 'فقط علاقه‌مندی‌ها',
    collectionEmpty: 'کتابخانه شما خالی است',
    collectionEmptyDesc:
      'برای جستجوی سریع، فایل‌های MP3، FLAC، WAV، M4A یا OGG را اضافه کنید.',
    noMatches: 'آهنگی یافت نشد',
    noMatchesDesc:
      'عبارت دیگری را امتحان کنید یا فیلتر علاقه‌مندی‌ها را خاموش نمایید.',
    resetFilters: 'پاک کردن فیلترها',
    found: 'مورد',

    modeGlassCover: 'کاور شیشه‌ای',
    modeTurntable: 'گرامافون',
    modeAmbientWave: 'موج صوتی',
    utilSleep: 'تایمر خواب',
    utilSpeed: 'سرعت',
    utilQueue: 'صف پخش',
    utilLyrics: 'متن آهنگ',
    utilEq: 'اکولایزر',
    utilOutput: 'خروجی',
    sleepTitle: 'تایمر خواب',
    speedTitle: 'سرعت پخش',
    queueTitle: 'صف پخش بعدی',
    lyricsTitle: 'متن همگام آهنگ',
    eqTitle: 'اکولایزر ۵ بانده',
    outputTitle: 'خروجی صدا',
    sleepOff: 'خاموش',
    sleepRemaining: 'دقیقه باقی‌مانده',
    pasteLyrics: 'جاگذاری',
    viewLyrics: 'نمایش',
    importLrc: 'فایل .lrc',
    noLyricsYet: 'هنوز متنی برای این آهنگ ثبت نشده است.',
    saveLyrics: 'ذخیره متن',
    cancel: 'انصراف',
    lyricsHelp: 'متن زمان‌بندی‌شده (.lrc) یا متن ساده آهنگ را وارد کنید:',
    tiltHint: 'برای افکت سه‌بعدی، کاور را لمس یا حرکت دهید',

    settingsEyebrow: 'تنظیمات ضروری و سریع',
    settingsTitle: 'تنظیمات',
    languageSection: 'زبان برنامه',
    languageLabel: 'زبان رابط کاربری',
    languageHint: 'تشخیص خودکار زبان سیستم · پشتیبانی کامل از راست‌به‌چپ (RTL)',
    filterSection: 'فیلتر ویس‌ها و پوشه‌ها',
    shortClipsLabel: 'حذف کلیپ‌های صوتی کوتاه',
    shortClipsHint: 'پنهان کردن خودکار ویس‌ها و صداهای کوتاه از کتابخانه',
    filterOff: 'خاموش',
    under30s: 'زیر ۳۰ ثانیه',
    under60s: 'زیر ۶۰ ثانیه',
    hiddenFoldersLabel: 'پوشه‌های پنهان',
    hiddenFoldersHint: 'جلوگیری از نمایش ویس‌های پیام‌رسان‌ها در لیست موزیک',
    addFolderPlaceholder: 'نام پوشه (مثلاً VoiceNotes)',
    addFolderBtn: 'افزودن',
    hiddenTracksNotice: 'مورد با فیلتر پنهان شد',
    tagEditorSection: 'ویرایشگر کاور و مشخصات آهنگ',
    tagEditorEmpty: 'برای ویرایش کاور یا مشخصات، ابتدا حداقل یک آهنگ اضافه کنید.',
    selectTrackLabel: 'انتخاب آهنگ',
    fieldTitle: 'نام آهنگ',
    fieldArtist: 'نام هنرمند',
    fieldAlbum: 'نام آلبوم',
    uploadCustomCover: 'انتخاب کاور جدید',
    saveTagChanges: 'ذخیره تغییرات',
    savedTagNotice: 'مشخصات آهنگ ذخیره شد',
    storageAboutSection: 'مدیریت حافظه و درباره برنامه',
    coverCacheLabel: 'حافظه کش کاورها',
    coverCacheHint: 'تصاویر کاور و متادیتای ذخیره‌شده در حافظه',
    clearCacheBtn: 'پاک‌سازی کش',
    cacheClearedNotice: 'حافظه کش کاورها پاک شد',
    aboutTagline: 'پخش‌کننده موسیقی مدرن و لمسی با رنگ‌بندی پویا و هوشمند.',
    whatsNewBtn: 'تغییرات نسخه جدید',
    whatsNewTitle: 'تازه‌های سیون نسخه ۱.۰.۰',
    whatsNewItems: [
      'کاور شیشه‌ای سه‌بعدی با هاله نور پویا هماهنگ با بیس موسیقی',
      'پنل‌های ابزار شناور و آنی بدون نیاز به اسکرول در صفحه پخش',
      'اسکنر هوشمند محلی با استخراج واقعی کاور از فایل‌های ID3، MP4 و FLAC',
      'پشتیبانی کامل از زبان فارسی (RTL) و فیلتر هوشمند ویس‌ها و پوشه‌ها',
    ],
    closeBtn: 'بستن',
    nowPlayingDefaultLabel: 'نمای اصلی صفحه پخش',
    nowPlayingDefaultHint: 'همگام با سوئیچر بالای صفحه پخش',

    dropTitle: 'فایل‌های صوتی را رها کنید',
    dropSubtitle:
      'فایل‌های MP3، FLAC، WAV، M4A یا OGG را رها کنید تا کاورها استخراج و پخش شوند.',
  },
};
