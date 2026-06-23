// db-architecture — static constants (magic numbers, regex patterns).

/** SQL keyword regex for syntax highlighting. */
export const KEYWORDS =
  /\b(CREATE|TABLE|PRIMARY|KEY|FOREIGN|REFERENCES|NOT|NULL|DEFAULT|CHECK|IN|UNIQUE|INDEX|ON|CASCADE|DELETE|WITH|RECURSIVE|SELECT|FROM|WHERE|UNION|ALL|JOIN|AS|AND|OR|IS|USING|BETWEEN|GIN|LIKE|SET|BEGIN|END|RETURN|CALL|SIGNAL|SQLSTATE|PARTITION|BY|RANGE|VALUES|FOR|STORED|EXTENSION|IF|EXISTS|GENERATED|ALWAYS|ALTER|ADD|COLUMN)\b/g

/** SQL type keyword regex for syntax highlighting. */
export const TYPES =
  /\b(TEXT|INTEGER|INT|BIGINT|BIGSERIAL|SERIAL|SMALLINT|REAL|JSON|JSONB|UUID|CITEXT|NUMERIC|VARCHAR|CHAR|TIMESTAMPTZ|TSVECTOR|BOOLEAN|BOOLEAN)\b/g

/** Maximum CDC log lines visible at once. */
export const CDC_MAX_LINES = 8

/** ERD auto-highlight cycle interval in ms. */
export const ERD_AUTO_INTERVAL = 2800

/** Flow animation: time (ms) to traverse one edge segment at speed 1×. */
export const PACKET_SEG_MS = 1200
