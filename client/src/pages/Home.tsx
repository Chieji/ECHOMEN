import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useTheme } from '@/contexts/ThemeContext';
import { Menu, X, Moon, Sun, Copy, Check, Github, Zap, Shield, Workflow, Code2, Terminal, ChevronRight } from 'lucide-react';

/**
 * Premium Professional Design System
 * 
 * Inspired by: ChatGPT, Claude.ai, Anthropic
 * 
 * Color Palette:
 * - Primary: Professional Blue (#3b82f6)
 * - Secondary: Purple (#8b5cf6)
 * - Accent: Cyan (#06b6d4)
 * - Success: Emerald (#10b981)
 * 
 * Typography:
 * - Headlines: IBM Plex Sans, 700 weight
 * - Body: IBM Plex Sans, 400 weight
 * - Code: IBM Plex Mono
 * 
 * Spacing: Generous whitespace, premium feel
 * Animations: Smooth, subtle, professional
 */

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [cliOutput, setCliOutput] = useState<string[]>([]);
  const [isRunningDemo, setIsRunningDemo] = useState(false);

  // Simulate CLI threat scanning demo
  const runCliDemo = async () => {
    setIsRunningDemo(true);
    setCliOutput([]);
    
    const demoSteps = [
      '$ echoctl scan --target api.example.com',
      '⟳ Initializing threat scanner...',
      '✓ Connected to threat database',
      '⟳ Scanning endpoints...',
      '  → /api/auth (200 OK)',
      '  → /api/users (200 OK)',
      '  → /api/admin (403 Forbidden) ⚠️',
      '⟳ Analyzing vulnerabilities...',
      '⚠️  Found 3 potential threats:',
      '  1. SQL Injection risk in /api/search',
      '  2. Weak API authentication headers',
      '  3. Outdated dependency: lodash@4.17.15',
      '✓ Scan completed in 2.3s',
      '📊 Threat Level: MEDIUM',
      '💡 Recommendations:',
      '  - Update dependencies immediately',
      '  - Implement rate limiting',
      '  - Add input validation',
    ];

    for (let i = 0; i < demoSteps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 150));
      setCliOutput(prev => [...prev, demoSteps[i]]);
    }
    
    setIsRunningDemo(false);
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md transition-all duration-300">
        <div className="container flex items-center justify-between py-4">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">ECHOMEN</span>
          </motion.div>

          {/* Desktop Navigation */}
          <nav className="hidden gap-8 md:flex">
            {['Features', 'Demo', 'FAQ', 'Community'].map((item) => (
              <motion.a
                key={item}
                href={`#${item.toLowerCase()}`}
                whileHover={{ color: '#3b82f6' }}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                {item}
              </motion.a>
            ))}
          </nav>

          {/* Theme Toggle & Mobile Menu */}
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleTheme}
              className="rounded-lg p-2 hover:bg-muted transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </motion.button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden rounded-lg p-2 hover:bg-muted transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="border-t border-border bg-background px-4 py-4 md:hidden"
          >
            <nav className="flex flex-col gap-4">
              {['Features', 'Demo', 'FAQ', 'Community'].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                  {item}
                </a>
              ))}
            </nav>
          </motion.div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div
          className="absolute inset-0 -z-10 opacity-30"
          style={{
            backgroundImage: 'url(https://d2xsxph8kpxj0f.cloudfront.net/310519663568704090/Fz7rAXkQCqMwwVoPUWcS4j/echomen_hero_premium-FbzwPmrNYC8U8XbZVfsMzS.webp)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        
        <div className="container">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="max-w-3xl"
          >
            <motion.h1
              variants={itemVariants}
              className="text-4xl md:text-6xl font-bold leading-tight text-foreground mb-6"
            >
              The Autonomous Agent Ecosystem Built for <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Action</span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-lg text-muted-foreground mb-8 max-w-2xl"
            >
              Seamlessly switch between a high-speed CLI and a powerful Web UI. Execute tasks, manage MCP servers, and automate your workflow with ECHOMEN.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-white font-semibold"
                onClick={() => copyToClipboard('npm install -g echo-ai-cli', 0)}
              >
                <Terminal className="mr-2 h-5 w-5" />
                {copiedIndex === 0 ? 'Copied!' : 'Get Started'}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-border hover:bg-muted"
              >
                <Github className="mr-2 h-5 w-5" />
                View on GitHub
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Interactive CLI Demo */}
      <section id="demo" className="py-20 md:py-32 bg-muted/30">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
              Interactive Threat Scanner Demo
            </h2>
            <p className="text-muted-foreground mb-8 text-lg">
              See ECHOMEN's CLI in action. Click below to run a live threat scanning simulation.
            </p>

            {/* CLI Terminal */}
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-lg">
              <div className="bg-muted/50 border-b border-border px-4 py-3 flex items-center justify-between">
                <div className="flex gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                </div>
                <span className="text-xs font-mono text-muted-foreground">Terminal</span>
              </div>

              <div className="bg-card p-6 font-mono text-sm h-96 overflow-y-auto">
                {cliOutput.length === 0 && !isRunningDemo && (
                  <div className="text-muted-foreground text-center py-20">
                    <p>Click "Run Demo" to start the threat scanning simulation</p>
                  </div>
                )}
                
                {cliOutput.map((line, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`py-1 ${
                      line.includes('✓') ? 'text-green-500' :
                      line.includes('⚠️') ? 'text-yellow-500' :
                      line.includes('❌') ? 'text-red-500' :
                      line.includes('$') ? 'text-primary font-bold' :
                      'text-foreground'
                    }`}
                  >
                    {line}
                  </motion.div>
                ))}
                
                {isRunningDemo && (
                  <div className="text-primary animate-pulse">
                    ▌
                  </div>
                )}
              </div>
            </div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="mt-6"
            >
              <Button
                size="lg"
                onClick={runCliDemo}
                disabled={isRunningDemo}
                className="w-full md:w-auto bg-primary hover:bg-primary/90 text-white font-semibold"
              >
                {isRunningDemo ? 'Running Demo...' : 'Run Threat Scan Demo'}
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-32">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
              Powerful Features
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Everything you need to manage autonomous agents and secure your infrastructure.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Terminal className="h-8 w-8" />,
                title: 'Fast CLI',
                description: 'Lightning-quick command-line interface for power users and automation workflows.',
              },
              {
                icon: <Shield className="h-8 w-8" />,
                title: 'Threat Detection',
                description: 'Real-time vulnerability scanning and security analysis across your infrastructure.',
              },
              {
                icon: <Workflow className="h-8 w-8" />,
                title: 'Workflow Automation',
                description: 'Orchestrate complex tasks and manage MCP servers with intuitive automation.',
              },
              {
                icon: <Code2 className="h-8 w-8" />,
                title: 'Developer Friendly',
                description: 'Comprehensive API and SDK for seamless integration into your projects.',
              },
              {
                icon: <Zap className="h-8 w-8" />,
                title: 'High Performance',
                description: 'Optimized for speed with minimal resource consumption and instant feedback.',
              },
              {
                icon: <ChevronRight className="h-8 w-8" />,
                title: 'Extensible',
                description: 'Build custom plugins and extensions to tailor ECHOMEN to your needs.',
              },
            ].map((feature, idx) => (
              <motion.div
                key={idx}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1, duration: 0.5 }}
                whileHover={{ y: -5 }}
                className="p-6 rounded-xl border border-border bg-card hover:shadow-lg transition-all duration-300"
              >
                <div className="text-primary mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-2 text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Installation Section */}
      <section className="py-20 md:py-32 bg-muted/30">
        <div className="container max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
              Get Started in Minutes
            </h2>
            <p className="text-muted-foreground text-lg">
              Choose your preferred installation method.
            </p>
          </motion.div>

          <Tabs defaultValue="cli" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted">
              <TabsTrigger value="cli">CLI</TabsTrigger>
              <TabsTrigger value="web">Web Platform</TabsTrigger>
            </TabsList>

            <TabsContent value="cli" className="mt-6">
              <div className="rounded-xl border border-border bg-card p-6">
                <pre className="bg-muted/50 rounded-lg p-4 overflow-x-auto text-sm font-mono text-foreground mb-4">
                  <code>npm install -g echo-ai-cli</code>
                </pre>
                <Button
                  onClick={() => copyToClipboard('npm install -g echo-ai-cli', 1)}
                  variant="outline"
                  className="w-full"
                >
                  {copiedIndex === 1 ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Command
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="web" className="mt-6">
              <div className="rounded-xl border border-border bg-card p-6">
                <pre className="bg-muted/50 rounded-lg p-4 overflow-x-auto text-sm font-mono text-foreground mb-4">
                  <code>docker run -p 3000:3000 echomen/web-platform</code>
                </pre>
                <Button
                  onClick={() => copyToClipboard('docker run -p 3000:3000 echomen/web-platform', 2)}
                  variant="outline"
                  className="w-full"
                >
                  {copiedIndex === 2 ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Command
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 md:py-32">
        <div className="container max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
              Frequently Asked Questions
            </h2>
          </motion.div>

          <Accordion type="single" collapsible className="w-full space-y-3">
            {[
              {
                q: 'What is ECHOMEN?',
                a: 'ECHOMEN is an autonomous agent ecosystem that provides both a high-speed CLI and powerful web UI for managing tasks, MCP servers, and automating workflows.',
              },
              {
                q: 'How do I install ECHOMEN?',
                a: 'You can install ECHOMEN via npm (npm install -g echo-ai-cli) or use the Docker image for the web platform.',
              },
              {
                q: 'Is ECHOMEN open source?',
                a: 'Yes, ECHOMEN is fully open source and available on GitHub. We welcome contributions from the community.',
              },
              {
                q: 'Can I use ECHOMEN in production?',
                a: 'Absolutely! ECHOMEN is designed for production use with enterprise-grade security and reliability.',
              },
              {
                q: 'How do I get support?',
                a: 'Join our community Discord, check the documentation, or open an issue on GitHub. Our team is always ready to help.',
              },
            ].map((item, idx) => (
              <AccordionItem key={idx} value={`item-${idx}`} className="border border-border rounded-lg px-4">
                <AccordionTrigger className="hover:text-primary transition-colors">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Community Section */}
      <section id="community" className="py-20 md:py-32 bg-muted/30">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
              Join Our Community
            </h2>
            <p className="text-muted-foreground text-lg">
              Connect with developers, share ideas, and grow together.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { name: 'GitHub', icon: '🐙', url: '#' },
              { name: 'Discord', icon: '💬', url: '#' },
              { name: 'Twitter', icon: '𝕏', url: '#' },
              { name: 'Docs', icon: '📚', url: '#' },
            ].map((item, idx) => (
              <motion.a
                key={idx}
                href={item.url}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -5 }}
                className="p-6 rounded-xl border border-border bg-card hover:shadow-lg transition-all duration-300 text-center cursor-pointer"
              >
                <div className="text-4xl mb-3">{item.icon}</div>
                <h3 className="font-bold text-foreground">{item.name}</h3>
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/50 py-12">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold mb-4 text-foreground">ECHOMEN</h3>
              <p className="text-sm text-muted-foreground">
                The autonomous agent ecosystem built for action.
              </p>
            </div>
            {[
              { title: 'Product', links: ['Features', 'Pricing', 'Security'] },
              { title: 'Company', links: ['About', 'Blog', 'Careers'] },
              { title: 'Resources', links: ['Docs', 'API', 'Community'] },
            ].map((col, idx) => (
              <div key={idx}>
                <h4 className="font-semibold mb-4 text-foreground">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
            <p>&copy; 2026 ECHOMEN. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-primary transition-colors">Privacy</a>
              <a href="#" className="hover:text-primary transition-colors">Terms</a>
              <a href="#" className="hover:text-primary transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
