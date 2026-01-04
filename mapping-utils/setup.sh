if ! [[ "${BASH_SOURCE[0]}" != "$0" ]]; then
  echo "This script must be sourced, not executed directly."
  echo "Run 'source setup.sh' instead."
  exit 1
fi

if ! command -v pyenv >/dev/null 2>&1; then
  echo "pyenv not found, installing..."
  curl -fsSL https://pyenv.run | bash
fi
if ! command -v poetry >/dev/null 2>&1; then
  echo "Poetry not found, installing..."
  pip install poetry
fi
cat .python-version | xargs pyenv install
python -m venv ./.venv && source ./.venv/bin/activate
poetry lock && poetry install
if ! [ -f .aubuon-env ]; then
  echo ".env file not found, copying sample.env to .env"
  cp sample.env .aubuon-env
fi