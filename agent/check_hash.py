import hashlib


def main() -> None:
    key = input("Agent key a verificar: ").strip()
    if not key:
        print("Debes ingresar una clave")
        raise SystemExit(1)
    computed_hash = hashlib.sha256(key.encode("utf-8")).hexdigest()
    print(f"SHA256: {computed_hash}")


if __name__ == "__main__":
    main()
