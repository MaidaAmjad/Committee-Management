import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.scss'
})
export class LandingPageComponent implements AfterViewInit {

  ngAfterViewInit(): void {
    // Navbar scroll shadow
    window.addEventListener('scroll', () => {
      const navbar = document.getElementById('navbar');
      if (navbar) {
        navbar.classList.toggle('scrolled', window.scrollY > 20);
      }
    });

    // Scroll reveal with IntersectionObserver
    const reveals = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setTimeout(() => entry.target.classList.add('visible'), 60);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    reveals.forEach(el => observer.observe(el));

    // Staggered reveal for grids
    document.querySelectorAll(
      '.features-grid .feature-card, .platform-grid .pf-card, .profiles-grid .profile-card, .testi-grid .testi-card'
    ).forEach((el: Element, i: number) => {
      (el as HTMLElement).style.transitionDelay = (i % 4) * 0.08 + 's';
    });
  }

  toggleMenu(): void {
    const navLinks = document.getElementById('navLinks');
    if (navLinks) navLinks.classList.toggle('open');
  }

  toggleFaq(el: HTMLElement): void {
    const item = el.parentElement;
    if (!item) return;
    const wasOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
    if (!wasOpen) item.classList.add('open');
  }
}
