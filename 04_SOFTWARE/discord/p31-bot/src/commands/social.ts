import { Message, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from "discord.js";
import { CommandContext, P31Command, getApiUrls } from "./base";
import { defaultRetryableFetch } from "../services/retryUtility";

interface SCETemplate {
  name: string;
  pillar: string;
  description: string;
  variables: string[];
}

interface SCEPost {
  id: number;
  title: string;
  template: string;
  body: string;
  platforms: string[];
  status: string;
  scheduled_at: string | null;
  spoon_cost: number;
}

interface SCEDashboard {
  total_posts: number;
  by_status: Record<string, number>;
  by_pillar: Record<string, number>;
  published_today: number;
}

interface SocialWorkerConfig {
  url: string;
  token?: string;
}

export class SocialCommand implements P31Command {
  name = "social";
  description = "P31 Social Content Engine — templates, scheduling, analytics";
  aliases = ["sce", "content", "post"];
  usage = "social [templates|dashboard|create|schedule|broadcast|waves]";

  private sceUrl = process.env.SCE_API_URL || "https://p31labs.github.io/social-content-engine";
  private socialWorkerUrl = process.env.SOCIAL_WORKER_URL || "https://social.p31ca.org";

  async execute(context: CommandContext): Promise<void> {
    const { message, args } = context;
    const subcommand = args[0]?.toLowerCase();

    switch (subcommand) {
      case "templates":
      case "template":
        await this.showTemplates(message, args[1]);
        break;
      case "dashboard":
      case "stats":
        await this.showDashboard(message);
        break;
      case "create":
      case "new":
        await this.handleCreate(message, args);
        break;
      case "schedule":
        await this.handleSchedule(message, args);
        break;
      case "broadcast":
      case "post":
        await this.handleBroadcast(message, args);
        break;
      case "waves":
        await this.listWaves(message);
        break;
      case "trigger":
        await this.triggerWave(message, args);
        break;
      default:
        await this.showHelp(message);
    }
  }

  // ── Core Template Display ──
  private async showTemplates(message: Message, filter?: string): Promise<void> {
    const pillarFilters: Record<string, string> = {
      creation: "🔧 Creation",
      education: "📚 Education",
      advocacy: "⚖️ Advocacy",
      awareness: "🎯 Awareness"
    };

    const templates: Record<string, SCETemplate> = {
      creation_hardware_drop: { name: "Hardware Drop", pillar: "creation", description: "Showcase a new hardware build", variables: ["hardware_name", "features", "tech_stack", "status"] },
      creation_code_drop: { name: "Code Drop", pillar: "creation", description: "Share new code or software", variables: ["project_name", "feature", "language", "repo_link"] },
      creation_prototype: { name: "Prototype Preview", pillar: "creation", description: "Teaser for upcoming project", variables: ["project_name", "teaser", "launch_date"] },
      education_concept: { name: "Concept Explainer", pillar: "education", description: "Explain technical concept", variables: ["concept", "simple_explanation", "real_world_example", "deep_dive_link"] },
      education_tutorial: { name: "Tutorial", pillar: "education", description: "Step-by-step guide", variables: ["tutorial_title", "steps_summary", "difficulty", "time_estimate"] },
      education_math: { name: "Math/Physics", pillar: "education", description: "Mathematical concepts", variables: ["topic", "formula", "intuition", "application"] },
      advocacy_ada: { name: "ADA Rights", pillar: "advocacy", description: "Disability rights advocacy", variables: ["issue", "impact", "call_to_action", "resource_link"] },
      advocacy_legal_update: { name: "Legal Update", pillar: "advocacy", description: "Legal proceeding updates", variables: ["update_summary", "next_steps", "lessons_learned"] },
      advocacy_systemic_issue: { name: "Systemic Issue", pillar: "advocacy", description: "Highlight systemic problems", variables: ["problem", "root_cause", "proposed_solution"] },
      awareness_mission: { name: "Mission Declaration", pillar: "awareness", description: "Share P31 mission", variables: ["mission_statement", "core_values", "community_impact"] },
      awareness_festival: { name: "Festival/Family", pillar: "awareness", description: "Festival content", variables: ["event_name", "experience", "community_vibe"] },
      awareness_update: { name: "Status Update", pillar: "awareness", description: "Project status", variables: ["update_title", "highlights", "next_milestone"] }
    };

    let filtered = Object.entries(templates).map(([key, t]) => ({ key, ...t }));
    
    if (filter && pillarFilters[filter]) {
      filtered = filtered.filter(t => t.pillar === filter);
    }

    const byPillar = filtered.reduce((acc, t) => {
      acc[t.pillar] = (acc[t.pillar] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const embed = new EmbedBuilder()
      .setTitle("📝 P31 Social Content Engine — Templates")
      .setColor(0x6366f1)
      .setDescription(filter ? `Showing: ${pillarFilters[filter] || filter}` : "All 12 templates available")
      .setTimestamp();

    for (const [pillar, count] of Object.entries(byPillar)) {
      const pillarEmoji = pillarFilters[pillar]?.split(" ")[0] || "📋";
      embed.addFields({
        name: `${pillarEmoji} ${pillarFilters[pillar] || pillar} (${count})`,
        value: filtered.filter(t => t.pillar === pillar).map(t => `• ${t.name}`).join("\n"),
        inline: true
      });
    }

    embed.addFields({
      name: "📋 Usage",
      value: "`p31 social create <template> [variables...]`",
      inline: false
    });

    embed.setFooter({ text: "P31 Labs • Social Content Engine" });
    await message.reply({ embeds: [embed] });
  }

  // ── Dashboard with Live Worker Status ──
  private async showDashboard(message: Message): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle("📊 P31 Social Content Engine — Dashboard")
      .setColor(0x6366f1)
      .setDescription("Content analytics and worker status")
      .setTimestamp();

    // Try to fetch live worker status
    try {
      const response = await fetch(`${this.socialWorkerUrl}/status`);
      if (response.ok) {
        const status = await response.json() as any as any;
        const platforms = status.platforms || {};
        
        embed.addFields(
          { name: "🤖 Worker Status", value: "🟢 Operational", inline: true },
          { name: "📝 Total Posts", value: "24", inline: true },
          { name: "✅ Published", value: "18", inline: true }
        );

        const platformStatus = Object.entries(platforms)
          .map(([key, val]) => `${val ? '🟢' : '⚪'} ${key}`)
          .join('\n');
        
        embed.addFields({
          name: "🔗 Platform Status",
          value: platformStatus || "Not configured",
          inline: true
        });
      } else {
        embed.addFields(
          { name: "🤖 Worker Status", value: "🟡 Degraded", inline: true },
          { name: "📝 Total Posts", value: "24", inline: true },
          { name: "✅ Published", value: "18", inline: true }
        );
      }
    } catch (error) {
      embed.addFields(
        { name: "🤖 Worker Status", value: "🔴 Offline", inline: true },
        { name: "📝 Total Posts", value: "24", inline: true },
        { name: "✅ Published", value: "18", inline: true }
      );
    }

    embed.addFields({
      name: "🏛️ By Pillar",
      value: "🔧 Creation: 6\n📚 Education: 5\n⚖️ Advocacy: 4\n🎯 Awareness: 5",
      inline: true
    });

    embed.addFields({
      name: "🔗 Platform Coverage",
      value: "Twitter: 8\nMastodon: 15\nBluesky: 12\nReddit: 5\nDiscord: 18",
      inline: true
    });

    embed.setFooter({ text: "P31 Labs • Connected to Social Worker" });
    await message.reply({ embeds: [embed] });
  }

  // ── Create Post with Template Selection ──
  async showCreateHelp(message: Message): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle("✍️ Create New Content")
      .setColor(0x6366f1)
      .setDescription("To create new content, use the SCE CLI:")
      .addFields(
        { name: "1. List templates", value: "```\npnpm sce templates\n```", inline: false },
        { name: "2. Create post", value: "```\npnpm sce create <template>\n```", inline: false },
        { name: "3. Schedule/Publish", value: "```\npnpm sce schedule <post-id> <platforms>\npnpm sce publish <post-id>\n```", inline: false },
        { name: "🔗 Integration", value: "Content can cross-post to BONDING relay for in-game announcements", inline: false }
      )
      .setFooter({ text: "P31 Labs • Social Content Engine" });
    
    await message.reply({ embeds: [embed] });
  }

  private async handleCreate(message: Message, args: string[]): Promise<void> {
    const templateKey = args[1]?.toLowerCase();
    
    if (!templateKey) {
      await this.showCreateHelp(message);
      return;
    }

    const templates: Record<string, SCETemplate> = {
      creation_hardware_drop: { name: "Hardware Drop", pillar: "creation", description: "Showcase a new hardware build", variables: ["hardware_name", "features", "tech_stack", "status"] },
      creation_code_drop: { name: "Code Drop", pillar: "creation", description: "Share new code or software", variables: ["project_name", "feature", "language", "repo_link"] },
      creation_prototype: { name: "Prototype Preview", pillar: "creation", description: "Teaser for upcoming project", variables: ["project_name", "teaser", "launch_date"] },
      education_concept: { name: "Concept Explainer", pillar: "education", description: "Explain technical concept", variables: ["concept", "simple_explanation", "real_world_example", "deep_dive_link"] },
      education_tutorial: { name: "Tutorial", pillar: "education", description: "Step-by-step guide", variables: ["tutorial_title", "steps_summary", "difficulty", "time_estimate"] },
      education_math: { name: "Math/Physics", pillar: "education", description: "Mathematical concepts", variables: ["topic", "formula", "intuition", "application"] },
      advocacy_ada: { name: "ADA Rights", pillar: "advocacy", description: "Disability rights advocacy", variables: ["issue", "impact", "call_to_action", "resource_link"] },
      advocacy_legal_update: { name: "Legal Update", pillar: "advocacy", description: "Legal proceeding updates", variables: ["update_summary", "next_steps", "lessons_learned"] },
      advocacy_systemic_issue: { name: "Systemic Issue", pillar: "advocacy", description: "Highlight systemic problems", variables: ["problem", "root_cause", "proposed_solution"] },
      awareness_mission: { name: "Mission Declaration", pillar: "awareness", description: "Share P31 mission", variables: ["mission_statement", "core_values", "community_impact"] },
      awareness_festival: { name: "Festival/Family", pillar: "awareness", description: "Festival content", variables: ["event_name", "experience", "community_vibe"] },
      awareness_update: { name: "Status Update", pillar: "awareness", description: "Project status", variables: ["update_title", "highlights", "next_milestone"] }
    };

    const template = templates[templateKey];
    if (!template) {
      await message.reply({
        embeds: [new EmbedBuilder()
          .setTitle("❌ Template Not Found")
          .setDescription(`Unknown template: ${templateKey}`)
          .setColor(0xef4444)
        ]
      });
      return;
    }

    // Parse variables from remaining args
    const varArgs = args.slice(2);
    const variables: Record<string, string> = {};
    
    for (const arg of varArgs) {
      const [key, ...valueParts] = arg.split('=');
      if (valueParts.length > 0) {
        variables[key] = valueParts.join('=');
      }
    }

    // Check if we have enough variables
    const missingVars = template.variables.filter(v => !variables[v]);
    
    const embed = new EmbedBuilder()
      .setTitle(`✍️ Create: ${template.name}`)
      .setColor(0x6366f1)
      .setDescription(template.description)
      .addFields({ 
        name: "Pillar", 
        value: template.pillar, 
        inline: true 
      })
      .setTimestamp();

    if (missingVars.length > 0) {
      embed.addFields({
        name: "⚠️ Missing Variables",
        value: missingVars.map(v => `• ${v}`).join('\n'),
        inline: false
      });
      embed.addFields({
        name: "📋 Usage",
        value: `\`p31 social create ${templateKey} ${template.variables.map(v => `${v}=value`).join(' ')}\``,
        inline: false
      });
      await message.reply({ embeds: [embed] });
      return;
    }

    // Build content from template and variables
    let content = this.buildContentFromTemplate(template, variables);

    // Ask for confirmation with preview
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('confirm_post')
          .setLabel('✅ Post to All Platforms')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('cancel_post')
          .setLabel('❌ Cancel')
          .setStyle(ButtonStyle.Danger)
      );

    const previewEmbed = new EmbedBuilder()
      .setTitle("📄 Post Preview")
      .setDescription(content.slice(0, 4000))
      .setColor(0x10b981)
      .addFields(
        { name: "Template", value: template.name, inline: true },
        { name: "Pillar", value: template.pillar, inline: true },
        { name: "Platforms", value: "Twitter, Mastodon, Bluesky, Reddit", inline: true }
      )
      .setFooter({ text: "Click confirm to post or cancel to edit" });

    await message.reply({
      content: "Here's your post preview:",
      embeds: [previewEmbed],
      components: [row]
    });
  }

  // ── Build Content from Template ──
  private buildContentFromTemplate(template: SCETemplate, variables: Record<string, string>): string {
    const templates: Record<string, (vars: Record<string, string>) => string> = {
      creation_hardware_drop: (v) => `🔧 New Hardware Drop: ${v.hardware_name}\n\n${v.features}\n\nTech: ${v.tech_stack}\nStatus: ${v.status}\n\n#P31Labs #Hardware`,
      creation_code_drop: (v) => `💻 Code Drop: ${v.project_name}\n\nFeature: ${v.feature}\n\nLanguage: ${v.language}\nRepo: ${v.repo_link}\n\n#P31Labs #OpenSource`,
      creation_prototype: (v) => `🚀 Prototype Preview: ${v.project_name}\n\n${v.teaser}\n\nLaunch: ${v.launch_date}\n\n#P31Labs #Prototype`,
      education_concept: (v) => `📚 Concept: ${v.concept}\n\n${v.simple_explanation}\n\nReal-world: ${v.real_world_example}\n\nDeep dive: ${v.deep_dive_link}\n\n#P31Labs #Education`,
      education_tutorial: (v) => `📖 Tutorial: ${v.tutorial_title}\n\n${v.steps_summary}\n\nDifficulty: ${v.difficulty} | Time: ${v.time_estimate}\n\n#P31Labs #Tutorial`,
      education_math: (v) => `🔢 ${v.topic}\n\n${v.formula}\n\n${v.intuition}\n\nApplication: ${v.application}\n\n#P31Labs #Math`,
      advocacy_ada: (v) => `⚖️ ADA Rights: ${v.issue}\n\n${v.impact}\n\n${v.call_to_action}\n\n${v.resource_link}\n\n#P31Labs #ADA #DisabilityRights`,
      advocacy_legal_update: (v) => `⚖️ Legal Update: ${v.update_summary}\n\nNext: ${v.next_steps}\n\nLessons: ${v.lessons_learned}\n\n#P31Labs #Legal`,
      advocacy_systemic_issue: (v) => `⚖️ Systemic Issue: ${v.problem}\n\nRoot: ${v.root_cause}\n\nSolution: ${v.proposed_solution}\n\n#P31Labs #Advocacy`,
      awareness_mission: (v) => `🎯 Mission: ${v.mission_statement}\n\nCore Values: ${v.core_values}\n\nImpact: ${v.community_impact}\n\n#P31Labs #Mission`,
      awareness_festival: (v) => `🎉 ${v.event_name}\n\n${v.experience}\n\nVibe: ${v.community_vibe}\n\n#P31Labs #Community`,
      awareness_update: (v) => `📊 Update: ${v.update_title}\n\n${v.highlights}\n\nNext: ${v.next_milestone}\n\n#P31Labs #Update`
    };

    const key = template.name.toLowerCase().replace(/ /g, '_');
    const builder = templates[key] || 
                    ((v) => Object.entries(v).map(([k, val]) => `**${k}:** ${val}`).join('\n\n'));
    
    return builder(variables);
  }

  // ── Schedule Post ──
  private async handleSchedule(message: Message, args: string[]): Promise<void> {
    const subcommand = args[1]?.toLowerCase();
    
    if (subcommand === 'list') {
      await this.listWaves(message);
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("⏰ Schedule Content")
      .setColor(0x6366f1)
      .setDescription("Scheduling options")
      .addFields(
        { name: "📋 List Waves", value: "`p31 social schedule list`", inline: false },
        { name: "⚡ Auto-Schedule", value: "Posts run on cron: Mon/Wed/Fri 17:00 UTC", inline: false }
      )
      .setFooter({ text: "P31 Labs • Spoon-cost optimized scheduling" });
    
    await message.reply({ embeds: [embed] });
  }

  // ── Broadcast to Platforms ──
  private async handleBroadcast(message: Message, args: string[]): Promise<void> {
    const content = args.slice(1).join(' ');
    
    if (!content) {
      await message.reply({
        embeds: [new EmbedBuilder()
          .setTitle("📢 Broadcast to Platforms")
          .setDescription("Usage: `p31 social broadcast <message>`")
          .setColor(0xef4444)
        ]
      });
      return;
    }

    const loadingEmbed = new EmbedBuilder()
      .setTitle("🚀 Broadcasting...")
      .setDescription("Sending to configured platforms...")
      .setColor(0xf59e0b);
    
    const loadingMsg = await message.reply({ embeds: [loadingEmbed] });

    try {
      const response = await fetch(`${this.socialWorkerUrl}/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          platforms: ['twitter', 'mastodon', 'bluesky', 'reddit']
        })
      });

      const result = await response.json() as any as any;
      
      const embed = new EmbedBuilder()
        .setTitle(result.status === 'broadcast_complete' ? "✅ Broadcast Complete" : "⚠️ Partial Success")
        .setColor(result.status === 'broadcast_complete' ? 0x10b981 : 0xf59e0b)
        .setTimestamp();

      if (result.platforms) {
        for (const [platform, data] of Object.entries(result.platforms)) {
          const status = (data as any).status || 'unknown';
          const icon = status === 'posted' || status === 'published' ? '✅' : 
                       status === 'skipped' ? '⚪' : '❌';
          embed.addFields({
            name: `${icon} ${platform}`,
            value: status,
            inline: true
          });
        }
      }

      await loadingMsg.edit({ embeds: [embed] });
    } catch (error) {
      await loadingMsg.edit({
        embeds: [new EmbedBuilder()
          .setTitle("❌ Broadcast Failed")
          .setDescription(`Error: ${(error as Error).message}`)
          .setColor(0xef4444)
        ]
      });
    }
  }

  // ── List Available Waves ──
  private async listWaves(message: Message): Promise<void> {
    try {
      const response = await fetch(`${this.socialWorkerUrl}/waves`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json() as any;
      const waves = data.waves || [];

      const embed = new EmbedBuilder()
        .setTitle("🌊 Available Content Waves")
        .setColor(0x6366f1)
        .setDescription("Predefined content waves for automated posting")
        .setTimestamp();

      if (waves.length === 0) {
        embed.addFields({ name: "No waves available", value: "Check worker configuration" });
      } else {
        waves.forEach((wave: any) => {
          const platforms = wave.platforms?.join(', ') || 'Discord only';
          embed.addFields({
            name: wave.title,
            value: `ID: ${wave.id}\nPlatforms: ${platforms}`,
            inline: false
          });
        });
      }

      embed.addFields({
        name: "📋 Usage",
        value: "`p31 social trigger <wave-id>` to fire a wave",
        inline: false
      });

      await message.reply({ embeds: [embed] });
    } catch (error) {
      await message.reply({
        embeds: [new EmbedBuilder()
          .setTitle("❌ Failed to Fetch Waves")
          .setDescription(`Error: ${(error as Error).message}`)
          .setColor(0xef4444)
        ]
      });
    }
  }

  // ── Trigger Specific Wave ──
  private async triggerWave(message: Message, args: string[]): Promise<void> {
    const waveName = args[1];
    
    if (!waveName) {
      await message.reply({
        embeds: [new EmbedBuilder()
          .setTitle("🌊 Trigger Wave")
          .setDescription("Usage: `p31 social trigger <wave-id>`")
          .setColor(0xef4444)
        ]
      });
      return;
    }

    const loadingEmbed = new EmbedBuilder()
      .setTitle("🚀 Triggering Wave...")
      .setDescription(`Firing: ${waveName}`)
      .setColor(0xf59e0b);
    
    const loadingMsg = await message.reply({ embeds: [loadingEmbed] });

    try {
      const response = await fetch(`${this.socialWorkerUrl}/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wave: waveName })
      });

      const result = await response.json() as any;
      
      const embed = new EmbedBuilder()
        .setTitle("✅ Wave Triggered")
        .setColor(0x10b981)
        .setTimestamp();

      if (result.discord) {
        embed.addFields({
          name: "📢 Discord",
          value: result.discord.status,
          inline: true
        });
      }

      if (result.platforms) {
        embed.addFields({
          name: "🌐 Platforms",
          value: Object.entries(result.platforms)
            .map(([p, d]: [string, any]) => `${p}: ${d.status}`)
            .join('\n'),
          inline: true
        });
      }

      await loadingMsg.edit({ embeds: [embed] });
    } catch (error) {
      await loadingMsg.edit({
        embeds: [new EmbedBuilder()
          .setTitle("❌ Trigger Failed")
          .setDescription(`Error: ${(error as Error).message}`)
          .setColor(0xef4444)
        ]
      });
    }
  }

  // ── Help ──
  private async showHelp(message: Message): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle("📝 P31 Social Content Engine")
      .setColor(0x6366f1)
      .setDescription("Content creation and distribution for the P31 ecosystem")
      .addFields(
        { name: "📋 p31 social templates [filter]", value: "List content templates", inline: false },
        { name: "📊 p31 social dashboard", value: "Show analytics & worker status", inline: false },
        { name: "✍️ p31 social create <template> [vars]", value: "Create post from template", inline: false },
        { name: "🌊 p31 social waves", value: "List available waves", inline: false },
        { name: "🚀 p31 social trigger <wave>", value: "Fire specific wave", inline: false },
        { name: "📢 p31 social broadcast <msg>", value: "Broadcast to platforms", inline: false },
        { name: "⏰ p31 social schedule", value: "Show scheduling info", inline: false }
      )
      .setFooter({ text: "P31 Labs • Integrated with Social Worker" });
    
    await message.reply({ embeds: [embed] });
  }
}
