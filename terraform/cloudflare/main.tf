# ============================================================
# FORTUNE 1 — Cloudflare Infrastructure as Code
# Account: Trimtab.signal@proton.me (ee05f70c889cb6f876b9925257e3a2fa)
# Domains: p31ca.org, phosphorus31.org
# ============================================================

# ─── Data Sources ──────────────────────────────────────────
data "cloudflare_zone" "p31ca" {
  zone_id = var.zone_id_p31ca
}

data "cloudflare_zone" "phosphorus31" {
  zone_id = var.zone_id_phosphorus31
}

# ─── Pages Projects ────────────────────────────────────────
resource "cloudflare_pages_project" "p31ca_staging" {
  account_id        = var.account_id
  name              = "p31ca-staging"
  production_branch = "main"
}

resource "cloudflare_pages_project" "p31_oasis" {
  account_id        = var.account_id
  name              = "p31-oasis"
  production_branch = "main"
}

resource "cloudflare_pages_project" "p31_cli" {
  account_id        = var.account_id
  name              = "p31-cli"
  production_branch = "main"
}

# ─── D1 Databases ─────────────────────────────────────────
resource "cloudflare_d1_database" "p31_revenue" {
  account_id = var.account_id
  name       = "p31-revenue-db"
}

resource "cloudflare_d1_database" "p31_passkey" {
  account_id = var.account_id
  name       = "p31-passkey-db"
}

resource "cloudflare_d1_database" "p31_fhir" {
  account_id = var.account_id
  name       = "p31-fhir-db"
}

resource "cloudflare_d1_database" "epcp_audit" {
  account_id = var.account_id
  name       = "epcp-audit"
}

resource "cloudflare_d1_database" "mesh_logs" {
  account_id = var.account_id
  name       = "mesh_logs"
}

resource "cloudflare_d1_database" "p31_telemetry" {
  account_id = var.account_id
  name       = "p31-telemetry"
}

resource "cloudflare_d1_database" "simplex" {
  account_id = var.account_id
  name       = "simplex"
}

resource "cloudflare_d1_database" "phos_event_log" {
  account_id = var.account_id
  name       = "phos-event-log"
}

resource "cloudflare_d1_database" "p31_cortex" {
  account_id = var.account_id
  name       = "p31-cortex"
}

resource "cloudflare_d1_database" "love_ledger" {
  account_id = var.account_id
  name       = "love-ledger"
}

# ─── KV Namespaces ────────────────────────────────────────
resource "cloudflare_workers_kv_namespace" "glass_box_kv" {
  account_id = var.account_id
  title      = "glass_box_kv_prod"
}

resource "cloudflare_workers_kv_namespace" "state_staging" {
  account_id = var.account_id
  title      = "state_staging"
}

resource "cloudflare_workers_kv_namespace" "gridiron_gameplan" {
  account_id = var.account_id
  title      = "p31-gridiron-signal-GAMEPLAN_CACHE"
}

resource "cloudflare_workers_kv_namespace" "qfactor_state" {
  account_id = var.account_id
  title      = "p31-qfactor-state"
}

resource "cloudflare_workers_kv_namespace" "spoons_kv" {
  account_id = var.account_id
  title      = "SPOONS_KV"
}

resource "cloudflare_workers_kv_namespace" "bonding_game" {
  account_id = var.account_id
  title      = "p31-bonding-relay-GAME_KV"
}

resource "cloudflare_workers_kv_namespace" "k4_personal" {
  account_id = var.account_id
  title      = "K4_PERSONAL"
}

resource "cloudflare_workers_kv_namespace" "simplex_state" {
  account_id = var.account_id
  title      = "simplex-worker-SIMPLEX_STATE"
}

resource "cloudflare_workers_kv_namespace" "smallball_tendencies" {
  account_id = var.account_id
  title      = "p31-smallball-signal-TENDENCIES"
}

resource "cloudflare_workers_kv_namespace" "mesh_heartbeats" {
  account_id = var.account_id
  title      = "MESH_HEARTBEATS"
}

resource "cloudflare_workers_kv_namespace" "jitterbug_cache" {
  account_id = var.account_id
  title      = "jitterbug-api-jitterbug-status-cache"
}

resource "cloudflare_workers_kv_namespace" "donate_events" {
  account_id = var.account_id
  title      = "donate-api-DONATE_EVENTS"
}

resource "cloudflare_workers_kv_namespace" "archive_kv" {
  account_id = var.account_id
  title      = "ARCHIVE_KV"
}

# ─── R2 Buckets ────────────────────────────────────────────
resource "cloudflare_r2_bucket" "jitterbug_deliverables" {
  account_id = var.account_id
  name       = "jitterbug-deliverables"
}

resource "cloudflare_r2_bucket" "advocacy_ada" {
  account_id = var.account_id
  name       = "p31-advocacy-ada"
}

resource "cloudflare_r2_bucket" "advocacy_education" {
  account_id = var.account_id
  name       = "p31-advocacy-education"
}

resource "cloudflare_r2_bucket" "advocacy_medical" {
  account_id = var.account_id
  name       = "p31-advocacy-medical"
}

resource "cloudflare_r2_bucket" "edge_models" {
  account_id = var.account_id
  name       = "p31-edge-models"
}

resource "cloudflare_r2_bucket" "epcp_artifacts" {
  account_id = var.account_id
  name       = "p31-epcp-artifacts"
}

resource "cloudflare_r2_bucket" "epcp_audit_exports" {
  account_id = var.account_id
  name       = "p31-epcp-audit-exports"
}

resource "cloudflare_r2_bucket" "epcp_forensics_cold" {
  account_id = var.account_id
  name       = "p31-epcp-forensics-cold"
}

resource "cloudflare_r2_bucket" "epcp_forensics_hot" {
  account_id = var.account_id
  name       = "p31-epcp-forensics-hot"
}

resource "cloudflare_r2_bucket" "foundry_artifacts" {
  account_id = var.account_id
  name       = "p31-foundry-artifacts"
}

resource "cloudflare_r2_bucket" "game_assets" {
  account_id = var.account_id
  name       = "p31-game-assets"
}

resource "cloudflare_r2_bucket" "p31_mesh" {
  account_id = var.account_id
  name       = "p31-mesh-bucket"
}

# ─── Outputs ──────────────────────────────────────────────
output "pages_projects" {
  value = {
    p31ca_staging = cloudflare_pages_project.p31ca_staging.subdomain
    p31_oasis     = cloudflare_pages_project.p31_oasis.subdomain
    p31_cli       = cloudflare_pages_project.p31_cli.subdomain
  }
}

output "d1_databases" {
  value = {
    p31_revenue   = cloudflare_d1_database.p31_revenue.id
    p31_passkey   = cloudflare_d1_database.p31_passkey.id
    p31_fhir      = cloudflare_d1_database.p31_fhir.id
    p31_telemetry = cloudflare_d1_database.p31_telemetry.id
    p31_cortex    = cloudflare_d1_database.p31_cortex.id
  }
  sensitive = true
}

output "kv_namespaces" {
  value = {
    spoons_kv       = cloudflare_workers_kv_namespace.spoons_kv.id
    qfactor_state   = cloudflare_workers_kv_namespace.qfactor_state.id
    mesh_heartbeats = cloudflare_workers_kv_namespace.mesh_heartbeats.id
    donate_events   = cloudflare_workers_kv_namespace.donate_events.id
  }
  sensitive = true
}

output "r2_buckets" {
  value = {
    game_assets    = cloudflare_r2_bucket.game_assets.name
    jitterbug      = cloudflare_r2_bucket.jitterbug_deliverables.name
    epcp_artifacts = cloudflare_r2_bucket.epcp_artifacts.name
  }
}
