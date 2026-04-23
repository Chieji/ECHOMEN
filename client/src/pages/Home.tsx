import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Terminal, Globe, Cpu, Layers, Github, Mail, MessageCircle, BookOpen, ArrowRight, Check } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

/**
 * ECHOMEN Website - Neon Cyberpunk Minimalism Design
 * 
 * Design Philosophy:
 * - Electric teal (#00d9ff) and neon green (#39ff14) on deep black (#0a0e27)
 * - Terminal-inspired aesthetic with glowing borders and scanline effects
 * - Asymmetric layout with diagonal dividers and staggered sections
 * - IBM Plex Mono for headlines (technical authority), IBM Plex Sans for body
 * - Smooth entrance animations, glowing hover effects, and neon accents
 */

export default function Home() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      } as any,
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 md:px-8 overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663568704090/Fz7rAXkQCqMwwVoPUWcS4j/echomen_hero_main-VowDkGqpke4D8BjhmpFse5.webp"
            alt="Hero Background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/50 to-background/80"></div>
        </div>

        {/* Content */}
        <motion.div
          className="relative z-10 max-w-4xl mx-auto text-center"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.h1
            className="text-5xl md:text-7xl font-bold mb-6 font-mono tracking-tight"
            style={{ color: "#00d9ff" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            The Autonomous Agent Ecosystem Built for Action
          </motion.h1>

          <motion.p
            className="text-lg md:text-xl mb-8 text-muted-foreground max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            Seamlessly switch between a high-speed CLI and a powerful Web UI. Execute tasks, manage MCP servers, and automate your workflow with ECHOMEN.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold border border-primary/50 hover:border-primary shadow-lg hover:shadow-xl hover:shadow-primary/50 transition-all duration-300 group"
              onClick={() => copyToClipboard("npm install -g echo-ai-cli", "npm")}
            >
              <Terminal className="mr-2 w-5 h-5" />
              {copiedCode === "npm" ? "Copied!" : "npm install -g echo-ai-cli"}
              {copiedCode === "npm" && <Check className="ml-2 w-4 h-4" />}
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="border-primary/50 text-primary hover:bg-primary/10 hover:border-primary font-semibold transition-all duration-300"
              onClick={() => window.open("https://github.com/chieji/ECHOMEN", "_blank")}
            >
              <Github className="mr-2 w-5 h-5" />
              View Web UI on GitHub
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </motion.div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity } as any}
        >
          <div className="text-primary text-sm font-mono">Scroll to explore</div>
        </motion.div>
      </section>

      {/* Dual-Core Showcase Section */}
      <section className="relative py-20 md:py-32 px-4 md:px-8 bg-gradient-to-b from-background via-card/30 to-background">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.h2
              className="text-4xl md:text-5xl font-bold mb-4 font-mono"
              style={{ color: "#00d9ff" }}
              variants={itemVariants}
            >
              The Dual-Core Architecture
            </motion.h2>
            <motion.p
              className="text-lg text-muted-foreground max-w-2xl mx-auto"
              variants={itemVariants}
            >
              Harness the power of both terminal-first speed and visual orchestration
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 md:gap-12">
            {/* Echoctl CLI */}
            <motion.div
              className="relative group"
              variants={itemVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg blur-xl group-hover:blur-2xl transition-all duration-300 opacity-0 group-hover:opacity-100"></div>
              <Card className="relative bg-card/50 backdrop-blur border border-primary/30 hover:border-primary/60 transition-all duration-300 p-8 h-full">
                <div className="mb-6">
                  <img
                    src="https://d2xsxph8kpxj0f.cloudfront.net/310519663568704090/Fz7rAXkQCqMwwVoPUWcS4j/echomen_feature_cli-9tfLpvSi2Fuc9buPrhFwnQ.webp"
                    alt="Echoctl CLI"
                    className="w-full h-48 object-cover rounded-lg border border-primary/20"
                  />
                </div>
                <h3 className="text-2xl font-bold mb-4 font-mono" style={{ color: "#00d9ff" }}>
                  Echoctl (CLI)
                </h3>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <Terminal className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                    <span>Terminal-first power with instant execution</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Layers className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                    <span>MCP Integration for seamless tool connectivity</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Cpu className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                    <span>Extension Marketplace for custom capabilities</span>
                  </li>
                </ul>
              </Card>
            </motion.div>

            {/* ECHOMEN Platform */}
            <motion.div
              className="relative group"
              variants={itemVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 to-primary/20 rounded-lg blur-xl group-hover:blur-2xl transition-all duration-300 opacity-0 group-hover:opacity-100"></div>
              <Card className="relative bg-card/50 backdrop-blur border border-secondary/30 hover:border-secondary/60 transition-all duration-300 p-8 h-full">
                <div className="mb-6">
                  <img
                    src="https://d2xsxph8kpxj0f.cloudfront.net/310519663568704090/Fz7rAXkQCqMwwVoPUWcS4j/echomen_feature_web-BFnUpWmS4QiUuHXe2SU6SZ.webp"
                    alt="ECHOMEN Platform"
                    className="w-full h-48 object-cover rounded-lg border border-secondary/20"
                  />
                </div>
                <h3 className="text-2xl font-bold mb-4 font-mono" style={{ color: "#39ff14" }}>
                  ECHOMEN (Platform)
                </h3>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <Globe className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>Visual Task Pipeline for intuitive workflow design</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Cpu className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>Action/Chat/Plan Modes for flexible interaction</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Layers className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>Artifact Management for organized outputs</span>
                  </li>
                </ul>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section className="relative py-20 md:py-32 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.h2
              className="text-4xl md:text-5xl font-bold mb-4 font-mono"
              style={{ color: "#00d9ff" }}
              variants={itemVariants}
            >
              Powered by Innovation
            </motion.h2>
            <motion.p
              className="text-lg text-muted-foreground max-w-2xl mx-auto"
              variants={itemVariants}
            >
              Built with cutting-edge technologies for maximum performance and flexibility
            </motion.p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {[
              {
                icon: Cpu,
                title: "Autonomous Reasoning",
                description: "Powered by BDI (Belief-Desire-Intention) architecture",
                color: "#00d9ff",
              },
              {
                icon: Layers,
                title: "MCP Ready",
                description: "Full support for the Model Context Protocol",
                color: "#39ff14",
              },
              {
                icon: Globe,
                title: "Browser Automation",
                description: "Playwright integration for web interaction",
                color: "#00d9ff",
              },
              {
                icon: Terminal,
                title: "Multi-Provider",
                description: "Gemini, OpenAI, Anthropic, and Local LLMs",
                color: "#39ff14",
              },
            ].map((feature, idx) => (
              <motion.div key={idx} variants={itemVariants}>
                <Card className="bg-card/50 backdrop-blur border border-primary/20 hover:border-primary/60 p-6 h-full hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 group">
                  <div
                    className="w-12 h-12 rounded-lg mb-4 flex items-center justify-center border"
                    style={{
                      backgroundColor: feature.color + "20",
                      borderColor: feature.color + "40",
                      color: feature.color,
                    }}
                  >
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold mb-2 font-mono">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Interactive Installation Section */}
      <section className="relative py-20 md:py-32 px-4 md:px-8 bg-gradient-to-b from-background via-card/20 to-background">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="text-center mb-12"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.h2
              className="text-4xl md:text-5xl font-bold mb-4 font-mono"
              style={{ color: "#00d9ff" }}
              variants={itemVariants}
            >
              Get Started in Minutes
            </motion.h2>
          </motion.div>

          <motion.div
            variants={itemVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <Card className="bg-card/50 backdrop-blur border border-primary/30 p-8">
              <Tabs defaultValue="cli" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-background/50 border border-primary/20 mb-6">
                  <TabsTrigger value="cli" className="font-mono">
                    CLI (echoctl)
                  </TabsTrigger>
                  <TabsTrigger value="web" className="font-mono">
                    Web Platform
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="cli" className="space-y-4">
                  <div className="bg-background/80 border border-primary/20 rounded-lg p-6 font-mono text-sm">
                    <div className="text-secondary mb-2">$ npm install -g echo-ai-cli</div>
                    <div className="text-muted-foreground mb-4">Installing ECHOMEN CLI...</div>
                    <div className="text-secondary mb-2">$ echo auth login</div>
                    <div className="text-muted-foreground">Authenticate with your account to get started</div>
                  </div>
                  <Button
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold border border-primary/50"
                    onClick={() => copyToClipboard("npm install -g echo-ai-cli && echo auth login", "cli")}
                  >
                    <Copy className="mr-2 w-4 h-4" />
                    {copiedCode === "cli" ? "Copied!" : "Copy Commands"}
                  </Button>
                </TabsContent>

                <TabsContent value="web" className="space-y-4">
                  <div className="bg-background/80 border border-primary/20 rounded-lg p-6 font-mono text-sm">
                    <div className="text-secondary mb-2">$ git clone https://github.com/chieji/ECHOMEN.git</div>
                    <div className="text-muted-foreground mb-4">Cloning the ECHOMEN repository...</div>
                    <div className="text-secondary mb-2">$ docker compose up -d</div>
                    <div className="text-muted-foreground">Starting the web platform</div>
                  </div>
                  <Button
                    className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold border border-secondary/50"
                    onClick={() => copyToClipboard("git clone https://github.com/chieji/ECHOMEN.git && docker compose up -d", "web")}
                  >
                    <Copy className="mr-2 w-4 h-4" />
                    {copiedCode === "web" ? "Copied!" : "Copy Commands"}
                  </Button>
                </TabsContent>
              </Tabs>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Live Echo Simulation Section */}
      <section className="relative py-20 md:py-32 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="text-center mb-12"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.h2
              className="text-4xl md:text-5xl font-bold mb-4 font-mono"
              style={{ color: "#00d9ff" }}
              variants={itemVariants}
            >
              Watch ECHOMEN in Action
            </motion.h2>
          </motion.div>

          <motion.div
            variants={itemVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <Card className="bg-background border border-primary/30 p-8 overflow-hidden">
              <div className="bg-black/80 border border-primary/50 rounded-lg p-6 font-mono text-sm font-mono min-h-96 flex flex-col justify-between">
                <div>
                  <div className="text-primary mb-2 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                    ECHOMEN Terminal
                  </div>
                  <div className="text-muted-foreground mb-4 border-t border-primary/20 pt-4">
                    <div className="mb-3">
                      <span className="text-primary">&gt;</span> echo build a landing page for my new startup
                    </div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="text-secondary mb-3"
                    >
                      [Thinking...] Analyzing requirements and planning approach
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.2 }}
                      className="text-secondary mb-3"
                    >
                      [Planning: 4 steps identified] Design → Development → Testing → Deployment
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.9 }}
                      className="text-primary mb-3"
                    >
                      [Executing: Scraping design trends...] Gathering inspiration and best practices
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 2.6 }}
                      className="text-secondary"
                    >
                      [Success: Code generated in ./artifacts] Your landing page is ready!
                    </motion.div>
                  </div>
                </div>
                <div className="text-primary/50 text-xs">
                  Ready for your next command...
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Open Source & Community Section */}
      <section className="relative py-20 md:py-32 px-4 md:px-8 bg-gradient-to-b from-background via-card/20 to-background">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.h2
              className="text-4xl md:text-5xl font-bold mb-4 font-mono"
              style={{ color: "#00d9ff" }}
              variants={itemVariants}
            >
              Open Source & Community
            </motion.h2>
            <motion.p
              className="text-lg text-muted-foreground max-w-2xl mx-auto"
              variants={itemVariants}
            >
              ECHOMEN is built on transparency and collaboration. Join our growing community of developers and AI enthusiasts.
            </motion.p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {[
              {
                icon: Github,
                title: "GitHub",
                description: "Star and contribute to the project",
                link: "https://github.com/chieji/ECHOMEN",
              },
              {
                icon: MessageCircle,
                title: "Discord",
                description: "Join our community server",
                link: "#",
              },
              {
                icon: BookOpen,
                title: "Documentation",
                description: "Learn how to use ECHOMEN",
                link: "#",
              },
              {
                icon: Mail,
                title: "Newsletter",
                description: "Get the latest updates",
                link: "#",
              },
            ].map((item, idx) => (
              <motion.div key={idx} variants={itemVariants}>
                <Card className="bg-card/50 backdrop-blur border border-primary/20 hover:border-primary/60 p-6 h-full hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 cursor-pointer group">
                  <div className="w-12 h-12 rounded-lg mb-4 flex items-center justify-center border border-primary/40 bg-primary/10 group-hover:bg-primary/20 transition-all duration-300">
                    <item.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold mb-2 font-mono">{item.title}</h3>
                  <p className="text-muted-foreground text-sm mb-4">{item.description}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary hover:text-primary/80 p-0 h-auto font-semibold"
                    onClick={() => item.link !== "#" && window.open(item.link, "_blank")}
                  >
                    Learn more <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Footer CTA Section */}
      <section className="relative py-20 md:py-32 px-4 md:px-8 border-t border-primary/20">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.h2
              className="text-4xl md:text-5xl font-bold mb-6 font-mono"
              style={{ color: "#00d9ff" }}
              variants={itemVariants}
            >
              Ready to start your first mission?
            </motion.h2>
            <motion.p
              className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto"
              variants={itemVariants}
            >
              Get the ECHOMEN CLI today and unlock the power of autonomous agents.
            </motion.p>
            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
              variants={itemVariants}
            >
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold border border-primary/50 shadow-lg hover:shadow-xl hover:shadow-primary/50 transition-all duration-300"
                onClick={() => copyToClipboard("npm install -g echo-ai-cli", "footer")}
              >
                <Terminal className="mr-2 w-5 h-5" />
                {copiedCode === "footer" ? "Copied!" : "Get the CLI"}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-primary/50 text-primary hover:bg-primary/10 hover:border-primary font-semibold"
                onClick={() => window.open("https://github.com/chieji/ECHOMEN", "_blank")}
              >
                <Github className="mr-2 w-5 h-5" />
                Star on GitHub
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-primary/20 py-12 px-4 md:px-8 bg-background/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-bold font-mono mb-4" style={{ color: "#00d9ff" }}>
                ECHOMEN
              </h4>
              <p className="text-muted-foreground text-sm">
                The autonomous agent framework that unifies CLI power and web orchestration.
              </p>
            </div>
            <div>
              <h4 className="font-bold font-mono mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Documentation
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold font-mono mb-4">Community</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="https://github.com/chieji/ECHOMEN" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                    GitHub
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Discord
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Twitter/X
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold font-mono mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    License (MIT)
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Privacy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Terms
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-primary/20 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-muted-foreground text-sm">
              © 2026 ECHOMEN. All rights reserved. Built with ❤️ for developers.
            </p>
            <div className="flex gap-4 mt-4 md:mt-0">
              <a href="https://github.com/chieji/ECHOMEN" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <MessageCircle className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
