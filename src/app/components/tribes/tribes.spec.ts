import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Tribes } from './tribes';

describe('Tribes', () => {
  let component: Tribes;
  let fixture: ComponentFixture<Tribes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Tribes],
    }).compileComponents();

    fixture = TestBed.createComponent(Tribes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
