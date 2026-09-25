import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TribeCard } from './tribe-card';

describe('TribeCard', () => {
  let component: TribeCard;
  let fixture: ComponentFixture<TribeCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TribeCard],
    }).compileComponents();

    fixture = TestBed.createComponent(TribeCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
