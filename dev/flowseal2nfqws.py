#!/usr/bin/env python3

import argparse
import json
import re
import shlex
import sys
import urllib.request
from pathlib import Path

REPO = "Flowseal/zapret-discord-youtube"
LIST_DIR = "/opt/etc/nfqws2/lists"

LISTS = {
    ("--hostlist", "list-general.txt"): f"--hostlist={LIST_DIR}/list-general.list",
    ("--hostlist", "list-general-user.txt"): f"--hostlist={LIST_DIR}/user.list",
    ("--hostlist", "list-google.txt"): f"--hostlist={LIST_DIR}/list-google.list",
    ("--hostlist-exclude", "list-exclude.txt"): f"--hostlist-exclude={LIST_DIR}/list-exclude.list",
    ("--hostlist-exclude", "list-exclude-user.txt"): f"--hostlist-exclude={LIST_DIR}/exclude.list",
    ("--ipset-exclude", "ipset-exclude.txt"): f"--ipset-exclude={LIST_DIR}/ipset-exclude.list",
    ("--ipset-exclude", "ipset-exclude-user.txt"): f"--ipset-exclude={LIST_DIR}/ipset_exclude.list",
    ("--ipset", "ipset-all.txt"): f"--ipset={LIST_DIR}/ipset-all.list --ipset={LIST_DIR}/ipset.list --ipset-ip=0.0.0.0",
}

BLOBS = {
    "quic_initial_www_google_com.bin": "quic_google",
    "tls_clienthello_www_google_com.bin": "tls_google",
    "tls_clienthello_max_ru.bin": "tls_max_ru",
    "tls_clienthello_4pda_to.bin": "tls_4pda",
    "tls_clienthello_sochi_park.bin": "tls_sochi_park",
    "stun.bin": "stun",
    "stun2.bin": "stun2",
    "ACTIVE_DISCORD_UDP.bin": "discord_fake",
}

BLOB_TITLES = {
    "quic_google": "QUIC google.com",
    "tls_google": "google.com",
    "tls_max_ru": "max.ru",
    "tls_4pda": "4pda.to",
    "tls_sochi_park": "sochi.park",
    "stun": "stun",
    "stun2": "stun2",
    "discord_fake": "QUIC steamcommunity.com",
    "fake_default_tls": {"ru": "TLS по умолчанию", "en": "default TLS"},
    "fake_default_http": {"ru": "HTTP по умолчанию", "en": "default HTTP"},
    "0x00000000": {"ru": "4 нулевых байта", "en": "4 zero bytes"},
}


def blob_title(blob, lang):
    title = BLOB_TITLES.get(blob, blob)
    return title[lang] if isinstance(title, dict) else title


TS_INCREMENT = -600000
BADSEQ_INCREMENT = -10000
BADACK_INCREMENT = -66000
DEFAULT_TLS_MOD = "rnd,rndsni,dupsid"


class TranslateError(Exception):
    pass


def blob_name(value):
    if value == "^!":
        return "fake_default_tls"
    if re.fullmatch(r"0x[0-9a-fA-F]+", value):
        return value
    name = value.replace("%BIN%", "")
    if name not in BLOBS:
        raise TranslateError(f"неизвестный фейк {value}: добавьте его в BLOBS")
    return BLOBS[name]


def winws_args(bat_text):
    text = re.sub(r"\^\r?\n", " ", bat_text)
    for line in text.splitlines():
        if "winws.exe" in line:
            return shlex.split(line.split("winws.exe", 1)[1].lstrip('"'), posix=True)
    raise TranslateError("не найден запуск winws.exe")


def split_profiles(tokens):
    profiles, cur = [], []
    for tok in tokens:
        if tok == "--new":
            profiles.append(cur)
            cur = []
        elif tok.startswith("--wf-"):
            continue
        else:
            cur.append(tok)
    profiles.append(cur)
    return profiles


class Profile:
    def __init__(self, tokens):
        self.lists = []
        self.l3 = self.tcp = self.udp = self.l7 = None
        self.modes, self.fooling = [], []
        self.repeats = 1
        self.split_pos = self.seqovl = self.seqovl_pattern = None
        self.fakedsplit_pattern = None
        self.fake_tls, self.default_tls_mod = [], None
        self.fake_http, self.fake_quic = [], []
        self.fake_discord, self.fake_stun, self.fake_unknown_udp = [], [], []
        self.any_protocol = False
        self.cutoff = self.badseq = self.ip_id = None
        self.host = None
        self.altorder = False
        for tok in tokens:
            self._take(tok)

    def _take(self, tok):
        name, _, value = tok.partition("=")
        if name == "--filter-l3":
            self.l3 = value
        elif name == "--filter-tcp":
            self.tcp = value
        elif name == "--filter-udp":
            self.udp = value
        elif name == "--filter-l7":
            self.l7 = value
        elif name in ("--hostlist", "--hostlist-exclude", "--ipset-exclude", "--ipset"):
            key = (name, value.replace("%LISTS%", ""))
            if key not in LISTS:
                raise TranslateError(f"неизвестный список {tok}")
            self.lists.append(LISTS[key])
        elif name in ("--hostlist-domains", "--hostlist-exclude-domains"):
            self.lists.append(tok)
        elif name == "--ip-id":
            self.ip_id = value
        elif name == "--dpi-desync":
            self.modes = value.split(",")
        elif name == "--dpi-desync-fooling":
            self.fooling = value.split(",")
        elif name == "--dpi-desync-repeats":
            self.repeats = int(value)
        elif name == "--dpi-desync-split-pos":
            self.split_pos = value
        elif name == "--dpi-desync-split-seqovl":
            self.seqovl = value
        elif name == "--dpi-desync-split-seqovl-pattern":
            self.seqovl_pattern = blob_name(value)
        elif name == "--dpi-desync-fakedsplit-pattern":
            self.fakedsplit_pattern = value
        elif name == "--dpi-desync-fake-tls":
            self.fake_tls.append([blob_name(value), None])
        elif name == "--dpi-desync-fake-tls-mod":
            if self.fake_tls:
                self.fake_tls[-1][1] = value
            else:
                self.default_tls_mod = value
        elif name == "--dpi-desync-fake-http":
            self.fake_http.append(blob_name(value))
        elif name == "--dpi-desync-fake-quic":
            self.fake_quic.append(blob_name(value))
        elif name == "--dpi-desync-fake-discord":
            self.fake_discord.append(blob_name(value))
        elif name == "--dpi-desync-fake-stun":
            self.fake_stun.append(blob_name(value))
        elif name == "--dpi-desync-fake-unknown-udp":
            self.fake_unknown_udp.append(blob_name(value))
        elif name == "--dpi-desync-any-protocol":
            self.any_protocol = value in ("", "1")
        elif name == "--dpi-desync-cutoff":
            self.cutoff = value
        elif name == "--dpi-desync-badseq-increment":
            self.badseq = int(value)
        elif name == "--dpi-desync-hostfakesplit-mod":
            for part in value.split(","):
                key, _, val = part.partition("=")
                if key == "host":
                    self.host = val
                elif key == "altorder":
                    self.altorder = val != "0"
                else:
                    raise TranslateError(f"неизвестный мод hostfakesplit {part}")
        else:
            raise TranslateError(f"неизвестная опция {tok}")

    def ts_only(self):
        return "ts" in self.fooling and not ({"md5sig", "badseq"} & set(self.fooling))

    def fooling_args(self):
        out = []
        for f in self.fooling:
            if f == "ts":
                out.append(f"tcp_ts={TS_INCREMENT}")
            elif f == "md5sig":
                out.append("tcp_md5")
            elif f == "badseq":
                out += [f"tcp_seq={self.badseq if self.badseq is not None else BADSEQ_INCREMENT}",
                        f"tcp_ack={BADACK_INCREMENT}"]
            elif f != "none":
                raise TranslateError(f"неизвестный fooling {f}")
        return out


def instance(func, *args):
    return "--lua-desync=" + ":".join([func] + [a for a in args if a])


def emit_tcp(p, notes):
    out = []
    ipid = f"ip_id={p.ip_id}" if p.ip_id else None
    repeats = f"repeats={p.repeats}" if p.repeats > 1 else None
    fooling = p.fooling_args()
    split = [m for m in p.modes if m not in ("fake", "syndata")]
    if len(split) > 1:
        raise TranslateError(f"несколько способов разбиения {split}")
    split = split[0] if split else None

    if "syndata" in p.modes:
        out += ["--payload=all", instance("syndata", ipid)]
        if any(a.startswith("--hostlist=") for a in p.lists):
            notes.add("syndata")

    payloads = ["tls_client_hello"]
    if p.tcp is None or "80" in p.tcp.split(","):
        payloads.append("http_req")

    for payload in payloads:
        dep, indep = [], []
        if "fake" in p.modes:
            if payload == "tls_client_hello":
                fakes = [(b, m) for b, m in p.fake_tls] or [("fake_default_tls", p.default_tls_mod or DEFAULT_TLS_MOD)]
            else:
                fakes = [(b, None) for b in p.fake_http] or [("fake_default_http", None)]
            for blob, mod in fakes:
                mod_arg = f"tls_mod={mod}" if mod and mod != "none" else None
                dep.append(instance("fake", f"blob={blob}", mod_arg, *fooling, "tcp_ts_up", ipid, repeats))
        pos = f"pos={p.split_pos or '2'}"
        seqovl = f"seqovl={p.seqovl}" if p.seqovl else None
        pattern = f"seqovl_pattern={p.seqovl_pattern}" if p.seqovl_pattern else None
        if split == "multisplit":
            indep.append(instance("multisplit", pos, seqovl, pattern, "tcp_ts_up", ipid))
        elif split == "multidisorder":
            indep.append(instance("multidisorder_legacy", pos, seqovl, pattern, "tcp_ts_up", ipid))
        elif split == "fakedsplit":
            fpat = f"pattern={p.fakedsplit_pattern}" if p.fakedsplit_pattern and p.fakedsplit_pattern != "0x00" else None
            dep.append(instance("fakedsplit", pos, fpat, *fooling, "tcp_ts_up", ipid, repeats))
        elif split == "hostfakesplit":
            host = f"host={p.host}" if p.host else None
            dep.append(instance("hostfakesplit", host, *fooling, "tcp_ts_up", ipid, repeats))
            if p.altorder:
                notes.add("altorder")
        elif split:
            raise TranslateError(f"неизвестный способ {split}")
        if not dep and not indep:
            continue
        out.append(f"--payload={payload}")
        if dep and p.ts_only():
            out.append(instance("condition", "iff=cond_tcp_has_ts", f"instances={len(dep)}"))
            notes.add("ts")
        out += dep + indep
    return out


def emit_udp(p):
    out = []
    repeats = f"repeats={p.repeats}" if p.repeats > 1 else None
    if "fake" not in p.modes or [m for m in p.modes if m != "fake"]:
        raise TranslateError(f"для UDP поддерживается только fake, а не {p.modes}")
    groups = []
    if p.fake_quic:
        groups.append(("quic_initial", p.fake_quic, None))
    if p.fake_discord and p.fake_discord == p.fake_stun:
        groups.append(("discord_ip_discovery,stun", p.fake_discord, None))
    else:
        if p.fake_discord:
            groups.append(("discord_ip_discovery", p.fake_discord, None))
        if p.fake_stun:
            groups.append(("stun", p.fake_stun, None))
    if p.any_protocol and p.fake_unknown_udp:
        groups.append(("unknown", p.fake_unknown_udp, "payload=unknown"))
    for payload, blobs, extra in groups:
        out.append(f"--payload={payload}")
        out += [instance("fake", f"blob={b}", extra, repeats) for b in blobs]
    return out


def translate(bat_text):
    profiles, notes = [], set()
    for tokens in split_profiles(winws_args(bat_text)):
        if any("%GameFilter" in t for t in tokens):
            continue
        p = Profile(tokens)
        head = []
        if p.l3:
            head.append(f"--filter-l3={p.l3}")
        if p.tcp:
            head.append(f"--filter-tcp={p.tcp}")
        if p.udp:
            head.append(f"--filter-udp={p.udp}")
        if p.l7:
            head.append(f"--filter-l7={p.l7}")
        lines = [" ".join(head)] + p.lists
        if p.cutoff:
            lines.append(f"--out-range=<{p.cutoff}")
        body = emit_udp(p) if (p.udp or (p.l7 and not p.tcp)) else emit_tcp(p, notes)
        profiles.append((p, lines + body))
    return profiles, notes


def describe(profiles, notes):
    def main_profile(port):
        tcp = [p for p, _ in profiles if p.tcp and port in p.tcp.split(",")
               and not any(a.startswith("--ipset=") for a in p.lists)]
        listed = [p for p in tcp if any("list-general" in a for a in p.lists)]
        return (listed or tcp or [None])[0]

    def tcp_text(p, lang):
        if p is None:
            return None
        parts = []
        if "syndata" in p.modes:
            parts.append("syndata")
        if "fake" in p.modes:
            fakes = [b for b, _ in p.fake_tls] or ["fake_default_tls"]
            names = ", ".join(blob_title(b, lang) for b in fakes)
            if lang == "ru":
                word = "фейк" if len(fakes) == 1 else "фейки"
            else:
                word = "fake" if len(fakes) == 1 else "fakes"
            parts.append(f"{word} {names} ×{p.repeats}")
        split = [m for m in p.modes if m not in ("fake", "syndata")]
        if split:
            s = split[0]
            if p.seqovl:
                s += f" seqovl {p.seqovl}"
            if s.startswith("hostfakesplit") and p.host:
                s += f" ({p.host})"
            parts.append(s)
        if p.fooling and p.fooling != ["none"]:
            parts.append("fooling " + ",".join(p.fooling))
        return ", ".join(parts)

    main = main_profile("443")
    quic = next((p for p, _ in profiles if p.fake_quic), None)
    discord = next((p for p, _ in profiles if p.fake_discord), None)
    ru, en = [], []
    if main is not None:
        listed = any(a.startswith("--hostlist=") for a in main.lists)
        ru.append(("Сайты: " if listed else "Все сайты: ") + tcp_text(main, "ru"))
        en.append(("Sites: " if listed else "All sites: ") + tcp_text(main, "en"))
    if quic is not None:
        ru.append(f"QUIC: фейк ×{quic.repeats}")
        en.append(f"QUIC: fake ×{quic.repeats}")
    if discord is not None:
        ru.append(f"Голос Discord: фейк ×{discord.repeats}")
        en.append(f"Discord voice: fake ×{discord.repeats}")
    if "syndata" in notes:
        ru.append("syndata для сайтов из списков не срабатывает, как и у Flowseal: на SYN имени сайта ещё нет")
        en.append("syndata does not apply to listed sites, same as in Flowseal: SYN carries no hostname")
    return ru, en


def strategy_id(title):
    m = re.fullmatch(r"general(?: \((.+)\))?", title)
    if not m:
        raise TranslateError(f"странное имя {title}")
    return (m.group(1) or "general").lower().replace(" ", "-")


def sort_key(title):
    order = ["general", "ALT", "EXP", "FAKE TLS AUTO", "SIMPLE FAKE"]
    m = re.fullmatch(r"general(?: \((.+?)(\d*)\))?", title)
    base = (m.group(1) or "general").strip()
    num = int(m.group(2)) if m.group(2) else 1
    group = next((i for i, g in enumerate(order) if base == g or base.startswith(g + " ")), len(order))
    return group, base, num


def fetch(url):
    with urllib.request.urlopen(url, timeout=30) as r:
        return r.read().decode("utf-8")


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--tag", required=True, help="тег релиза Flowseal, например 1.10.3")
    ap.add_argument("--out", default=str(Path(__file__).resolve().parent.parent / "strategies"))
    args = ap.parse_args()

    listing = json.loads(fetch(f"https://api.github.com/repos/{REPO}/contents/?ref={args.tag}"))
    titles = sorted((f["name"][:-4] for f in listing if f["name"].startswith("general") and f["name"].endswith(".bat")),
                    key=sort_key)
    out = Path(args.out)
    out.mkdir(exist_ok=True)
    for old in out.glob("*.conf"):
        old.unlink()

    index = []
    for title in titles:
        url = f"https://raw.githubusercontent.com/{REPO}/{args.tag}/" + urllib.request.quote(title + ".bat")
        try:
            profiles, notes = translate(fetch(url))
        except TranslateError as e:
            sys.exit(f"{title}: {e}")
        sid = strategy_id(title)
        body = "\n--new\n".join("\n".join(lines) for _, lines in profiles)
        (out / f"{sid}.conf").write_text(
            f"# {title} из Flowseal zapret-discord-youtube {args.tag}\n"
            f'NFQWS_ARGS_CUSTOM="{body}"\n', encoding="utf-8", newline="\n")
        ru, en = describe(profiles, notes)
        index.append({"id": sid, "title": title, "ts": "ts" in notes, "approximate": "altorder" in notes,
                      "description": {"ru": ru, "en": en}})
        print(f"{sid:22} {title:32} профилей {len(profiles)}{'  ts' if 'ts' in notes else ''}"
              f"{'  ~' if 'altorder' in notes else ''}")

    (out / "index.json").write_text(
        json.dumps({"flowseal": args.tag, "default": "alt11", "strategies": index}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8", newline="\n")


if __name__ == "__main__":
    main()
