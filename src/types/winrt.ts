export type NowPlaying = {
  title: string;
  artist: string;
  album: string;
  thumbnail: Iterable<number>;
  guid: string;
};

export type Session = BaseSessionInfo & {
  source: string;
  session?: SessionModel;
  image?: Iterable<number>;
};

export type BaseSessionInfo = {
  sessionId: string;
};

export type SessionCreate = BaseSessionInfo & {
  source: string;
};

export type SessionModel = {
  playback?: PlaybackModel;
  timeline?: TimelineModel;
  media?: MediaModel;
  source: string;
};

export type PlaybackType = 'Unknown' | 'Music' | 'Video' | 'Image';

export type PlaybackModel = {
  status: 'Closed' | 'Opened' | 'Changing' | 'Stopped' | 'Playing' | 'Paused';
  'r#type': PlaybackType;
  rate: number;
  shuffle: boolean;
  autoRepeat: 'None' | 'Track' | 'List';
};

export type TimelineModel = {
  start: number;
  end: number;
  position: number;
  lastUpdatedAtMs: number;
};

export type MediaModel = {
  title: string;
  subtitle: string;
  artist: string;
  album?: AlbumModel;
  trackNumber?: number;
  genres: string[];
  playbackType: PlaybackType;
};

export type AlbumModel = {
  artist: string;
  title: string;
  trackCount: number;
};

export type SessionUpdate = BaseSessionInfo & {
  source: string;
  sessionModel: SessionModel;
  image?: Iterable<number>;
};

export type SessionRemove = BaseSessionInfo;

export type ActiveSessionChange = BaseSessionInfo;
