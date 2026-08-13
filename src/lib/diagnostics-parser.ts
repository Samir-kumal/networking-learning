const OPTION_VALUES: Record<string, Record<string, true>> = {
  ping: { "-c": true, "-i": true, "-s": true, "-t": true, "-W": true, "-w": true },
  traceroute: { "-m": true, "-p": true, "-q": true, "-w": true },
  tracert: { "-h": true, "-w": true },
  mtr: { "-c": true, "-i": true, "-s": true },
  nmap: { "-p": true, "-i": true, "-T": true, "--top-ports": true, "--min-rate": true },
};

const DIG_RECORD_TYPES: Record<string, true> = {
  A: true,
  AAAA: true,
  MX: true,
  NS: true,
  TXT: true,
  CNAME: true,
  SOA: true,
  ANY: true,
};

/** Finds the positional host/domain argument in a supported diagnostic command. */
export function parseCommandTarget(command: string, args: readonly string[]): string | undefined {
  const normalizedCommand = command.toLowerCase();
  const valueOptions = OPTION_VALUES[normalizedCommand] ?? {};

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token) continue;

    if (valueOptions[token]) {
      index += 1;
      continue;
    }

    // Support compact forms such as -c4 and -p22,80 for the same options.
    if (Object.keys(valueOptions).some((option) => token.startsWith(option) && token.length > option.length)) {
      continue;
    }

    if (token.startsWith("-") || token.startsWith("+") || token.startsWith("@")) {
      continue;
    }

    if (normalizedCommand === "dig" && DIG_RECORD_TYPES[token.toUpperCase()]) {
      continue;
    }

    return token;
  }

  return undefined;
}
