const Footer = () => {
  return (
    <footer className="border-t border-border py-12 bg-card">
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1 space-y-3">
            <h3 className="text-lg font-extrabold text-primary">DS Review Hub</h3>
            <p className="text-sm text-muted-foreground">
              Practical brand reviews, buying guidance, and current shopping offers.
            </p>
          </div>
          {[
            { title: "Company", links: ["About", "Review Methodology", "Contact", "Insights"] },
            { title: "Legal", links: ["Privacy Policy", "Terms of Service", "Affiliate Disclosure"] },
            { title: "Explore", links: ["Brand Reviews", "Review Categories", "Current Offers"] },
          ].map((col) => (
            <div key={col.title} className="space-y-3">
              <h4 className="text-sm font-bold text-foreground">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((link) => {
                  const linkHref = link === "Brand Reviews" ? "/#review-library" : link === "Insights" ? "/insights" : link === "Review Methodology" ? "/learn" : link === "Review Categories" ? "/#review-library" : link === "Current Offers" ? "/deals" : link === "Privacy Policy" ? "/privacy" : link === "Terms of Service" ? "/terms" : link === "About" ? "/about" : link === "Contact" ? "/contact" : link === "Affiliate Disclosure" ? "/disclosure" : "#";
                  return (
                    <li key={link}>
                      <a href={linkHref} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {link}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-8 space-y-2 border-t border-border pt-8 text-center text-xs text-muted-foreground">
          <p>Some links may earn us a commission. Our reviews are designed to help readers evaluate the tradeoffs before buying.</p>
          <p>© 2026 DS Review Hub. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
