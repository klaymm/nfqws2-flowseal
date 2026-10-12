#!/opt/bin/sh

main() {
  PATH=/opt/sbin:/opt/bin:/opt/usr/bin:/usr/sbin:/usr/bin:/sbin:/bin
  export PATH
  url=https://github.com/klaymm/nfqws2-flowseal/archive/refs/heads/main.tar.gz

  if [ ! -x /opt/bin/opkg ]; then
    echo "Нужен Entware: https://help.keenetic.com/hc/ru/articles/360021888880" >&2
    exit 1
  fi

  mkdir -p /opt/tmp
  work=$(mktemp -d /opt/tmp/nfqws2-flowseal.XXXXXX) || exit 1
  trap 'rm -rf "$work"' EXIT

  echo "Скачиваю сборку nfqws2-flowseal"
  if ! wget -q -T 30 -t 3 -O "$work/build.tar.gz" "$url"; then
    echo "Не удалось скачать $url. Для HTTPS нужны пакеты ca-certificates и wget-ssl" >&2
    exit 1
  fi
  tar -xzf "$work/build.tar.gz" -C "$work" || exit 1

  sh "$work/nfqws2-flowseal-main/nfqws2-flowseal" install "$work/nfqws2-flowseal-main" "$@" < /dev/null
}

main "$@"
