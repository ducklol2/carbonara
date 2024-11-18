# carbonara 🍝

## Setup

1. Install Nix (https://nixos.org/download/) - requires password:

   ```
   sh <(wget -O - https://nixos.org/nix/install) --no-daemon
   . .nix-profile/etc/profile.d/nix.sh
   ```

1. Start temporary shell with git:

   ```
   nix-shell -p git
   ```

1. Clone:

   ```
   git clone https://github.com/ducklol2/carbonara.git
   ```

1. Exit temporary shell: _Ctrl+D_

1. Install `direnv` (automatically loads .envrc in directory & runs Nix) - https://direnv.net/docs/installation.html:

   ```
   sudo apt-get install direnv
   ```

1. Enter directory & enable this .envrc:

   ```
   cd carbonara
   direnv allow
   ```

## Run

   ```
   node run.mjs
   ```

## Update
   
   ```
   git pull
   ```
